    import { db, auth } from "./firebase-config.js";
    import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
    import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

    // --- TODA A LÓGICA ORIGINAL PRESERVADA ---
    let dadosAdmin = null;

    function configurarDatasPadrao() {
        const agora = new Date();
        const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
        const hoje = agora.toISOString().split('T')[0];
        
        document.getElementById("dataInicio").value = primeiroDia;
        document.getElementById("dataFim").value = hoje;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
                dadosAdmin = snap.data();
                document.getElementById("nomeAdmin").innerText = dadosAdmin.nomeCompleto;
            }
            configurarDatasPadrao();
            carregarPedidos();
        } else { window.location.href = "index.html"; }
    });

    document.getElementById("btnLogout").onclick = () => confirm("Deseja sair?") && signOut(auth).then(() => window.location.href = "index.html");

    window.carregarPedidos = function() {
        const dInicio = new Date(document.getElementById("dataInicio").value + "T00:00:00");
        const dFim = new Date(document.getElementById("dataFim").value + "T23:59:59");
        const q = query(collection(db, "pedidos"), orderBy("data", "desc"));
        
        onSnapshot(q, (snapshot) => {
            const pendentes = [];
            const concluidos = [];
            snapshot.forEach(res => {
                const p = { id: res.id, ...res.data() };
                const dataPedido = p.data?.toDate();
                if(p.status === "Pendente") { pendentes.push(p); } 
                else if (dataPedido >= dInicio && dataPedido <= dFim) { concluidos.push(p); }
            });
            renderizar(pendentes, "listaPendentes");
            renderizar(concluidos, "listaConcluidos");
        });
    }

    function renderizar(lista, containerId) {
        const cont = document.getElementById(containerId);
        cont.innerHTML = lista.length ? "" : '<p style="text-align:center; color:#ddd; padding:20px;">Nenhum pedido para este filtro.</p>';

        lista.forEach(p => {
            const isPendente = p.status === 'Pendente';
            const textoProdutos = p.itens.map(i => i.desc).join(' ');
            const html = `
                <div class="card-pedido ${isPendente ? 'card-pendente' : 'card-concluido'}" id="card_${p.id}" data-busca="${p.loja.toLowerCase()} ${p.gerente.toLowerCase()} ${textoProdutos.toLowerCase()}">
                    <div class="card-header-click" onclick="toggleCard('${p.id}')">
                        <div>
                            <div class="loja-nome">${p.loja}</div>
                            <small>Solicitante: <b>${p.gerente}</b></small><br>
                            <small>${p.data?.toDate().toLocaleString()}</small>
                        </div>
                        <span class="status-badge" style="background:${isPendente ? 'var(--pendente)' : 'var(--concluido)'}">${p.status}</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    
                    <div class="card-body-expansivel" id="body_${p.id}">
                        <div class="table-wrapper">
                            <table class="itens-lista-table">
                                <thead><tr><th>Cód</th><th>Produto</th><th>Qtd</th>${isPendente ? '<th>Ações</th>' : ''}</tr></thead>
                                <tbody>
                                    ${p.itens.map((i, index) => `
                                        <tr>
                                            <td>${i.codigo}</td>
                                            <td>${i.desc}</td>
                                            <td>
                                                ${isPendente ? 
                                                    `<input type="number" class="input-qtd-edit" value="${i.qtdPedida}" onchange="atualizarQtdLocal('${p.id}', ${index}, this.value)">` 
                                                    : `x${i.qtdPedida}`}
                                            </td>
                                            ${isPendente ? `<td><button class="btn-remover-item" onclick="removerItemLocal('${p.id}', ${index})"><i class="fas fa-trash"></i></button></td>` : ''}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="acao-admin">
                            ${isPendente ? `
                                <input type="text" id="num_${p.id}" class="input-transf" placeholder="Nº Transferência">
                                <button class="btn-confirmar" onclick="finalizarPedido('${p.id}')">APROVAR</button>
                                <button class="btn-cancelar-pedido" onclick="cancelarPedidoInteiro('${p.id}')">CANCELAR</button>
                            ` : `
                                <div style="flex:1; font-size:0.85rem;">Ref: <b>${p.numTransferencia}</b> | Por: ${p.adminResponsavel}</div>
                                <button class="btn-pdf" onclick="gerarPDF('${p.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
                            `}
                        </div>
                    </div>
                </div>`;
            cont.innerHTML += html;
        });
    }

    // --- FUNÇÕES DE INTERAÇÃO (SEM ALTERAÇÃO) ---
    window.toggleCard = (id) => {
        const body = document.getElementById(`body_${id}`);
        const card = document.getElementById(`card_${id}`);
        const aberto = body.style.display === "block";
        body.style.display = aberto ? "none" : "block";
        card.classList.toggle("card-aberto", !aberto);
    };

    window.filtrarPedidos = () => {
        const termo = document.getElementById("campoBusca").value.toLowerCase();
        document.querySelectorAll(".card-pedido").forEach(card => {
            const info = card.getAttribute("data-busca");
            card.style.display = info.includes(termo) ? "block" : "none";
        });
    };

    window.atualizarQtdLocal = async (pedidoId, itemIndex, novaQtd) => {
        try {
            const snap = await getDoc(doc(db, "pedidos", pedidoId));
            const p = snap.data();
            const itens = [...p.itens];
            const item = itens[itemIndex];
            const diferenca = parseInt(novaQtd) - item.qtdPedida;
            const prodRef = doc(db, "produtos_transbordo", item.idDoc);
            const prodSnap = await getDoc(prodRef);
            if(!prodSnap.exists()) return alert("Produto não encontrado na vitrine!");
            const estoqueAtual = prodSnap.data().qtd;
            if (diferenca > estoqueAtual) {
                alert(`Estoque insuficiente! Disponível: ${estoqueAtual}`);
                carregarPedidos();
                return;
            }
            item.qtdPedida = parseInt(novaQtd);
            await updateDoc(doc(db, "pedidos", pedidoId), { itens });
            await updateDoc(prodRef, { qtd: estoqueAtual - diferenca });
        } catch (e) { console.error(e); }
    };

    window.removerItemLocal = async (pedidoId, itemIndex) => {
        if(!confirm("Remover item?")) return;
        try {
            const snap = await getDoc(doc(db, "pedidos", pedidoId));
            const p = snap.data();
            const item = p.itens[itemIndex];
            const prodRef = doc(db, "produtos_transbordo", item.idDoc);
            const prodSnap = await getDoc(prodRef);
            if(prodSnap.exists()) await updateDoc(prodRef, { qtd: prodSnap.data().qtd + item.qtdPedida });
            const novosItens = p.itens.filter((_, idx) => idx !== itemIndex);
            novosItens.length === 0 ? await deleteDoc(doc(db, "pedidos", pedidoId)) : await updateDoc(doc(db, "pedidos", pedidoId), { itens: novosItens });
        } catch (e) { console.error(e); }
    };

    window.cancelarPedidoInteiro = async (id) => {
        if(!confirm("Cancelar pedido e devolver itens à vitrine?")) return;
        try {
            const snap = await getDoc(doc(db, "pedidos", id));
            const p = snap.data();
            const batch = writeBatch(db);
            for(let item of p.itens) {
                const ref = doc(db, "produtos_transbordo", item.idDoc);
                const pSnap = await getDoc(ref);
                if(pSnap.exists()) batch.update(ref, { qtd: pSnap.data().qtd + item.qtdPedida });
            }
            batch.delete(doc(db, "pedidos", id));
            await batch.commit();
        } catch (e) { console.error(e); }
    };

    window.finalizarPedido = async (id) => {
        const num = document.getElementById(`num_${id}`).value;
        if(!num) return alert("Insira o Nº da Transferência!");
        await updateDoc(doc(db, "pedidos", id), {
            status: "Concluído",
            numTransferencia: num,
            adminResponsavel: dadosAdmin.nomeCompleto,
            dataConfirmacao: serverTimestamp()
        });
        alert("Aprovado!");
    };
    
    window.gerarPDF = async (id) => {
        const snap = await getDoc(doc(db, "pedidos", id));
        if (!snap.exists()) return;

        const p = snap.data();
        const { jsPDF } = window.jspdf;
        const docPdf = new jsPDF();
        const formatarMoeda = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Cabeçalho
        docPdf.setFontSize(35);
        docPdf.setTextColor(227, 6, 19);
        docPdf.setFont(undefined, 'bold');
        docPdf.text("MS", 105, 20, { align: "center" });

        docPdf.setFontSize(14);
        docPdf.setTextColor(44, 62, 80);
        docPdf.text("RELATÓRIO DE TRANSFERÊNCIA DE ESTOQUE", 105, 30, { align: "center" });
        docPdf.setDrawColor(200, 200, 200);
        docPdf.line(15, 35, 195, 35);

        // Informações (Organizadas em coluna única à esquerda)
        docPdf.setFontSize(10);
        docPdf.setFont(undefined, 'bold');
        let startYInfo = 45;
        docPdf.text(`Nº TRANSFERÊNCIA: ${p.numTransferencia || '---'}`, 15, startYInfo);
        docPdf.text(`UNIDADE: ${p.loja}`, 15, startYInfo + 6);
        
        docPdf.setFont(undefined, 'normal');
        docPdf.text(`Solicitado por: ${p.gerente} | Data: ${p.data?.toDate().toLocaleString('pt-BR') || '---'}`, 15, startYInfo + 14);
        docPdf.text(`Aprovado por: ${p.adminResponsavel || '---'} | Data: ${p.dataConfirmacao?.toDate().toLocaleString('pt-BR') || '---'}`, 15, startYInfo + 20);

        // Tabela
        let totalFinanceiro = 0;
        let totalItensFisicos = 0;
        const linhas = p.itens.map(i => {
            const qtd = parseInt(i.qtdPedida || 0);
            const sub = qtd * parseFloat(i.valor || 0);
            totalFinanceiro += sub;
            totalItensFisicos += qtd;
            return [i.fornecedor || '---', i.codigo, i.desc, qtd, formatarMoeda(i.valor), formatarMoeda(sub)];
        });

        docPdf.autoTable({
            startY: startYInfo + 26, 
            head: [["FORNECEDOR", "CÓD", "DESCRIÇÃO", "QTD", "UNIT.", "TOTAL"]],
            body: linhas,
            headStyles: { fillColor: [227, 6, 19] },
            theme: 'grid' // Adiciona as linhas nas colunas e horizontais
        });

        // Rodapé do PDF
        const finalY = docPdf.lastAutoTable.finalY + 8;
        docPdf.setFont(undefined, 'bold');
        docPdf.text(`Total de Itens: ${totalItensFisicos}`, 155, finalY);
        docPdf.text(`VALOR TOTAL: ${formatarMoeda(totalFinanceiro)}`, 155, finalY + 7);
        
        docPdf.setFontSize(8);
        docPdf.setFont(undefined, 'italic');
        docPdf.text(`Documento emitido em: ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}`, 15, 285);
        docPdf.text("__________________________________________", 105, 275, { align: "center" });
        docPdf.text("Assinatura Responsável", 105, 280, { align: "center" });

        docPdf.save(`Transf_${p.numTransferencia || 'DOC'}_${p.loja}.pdf`);
    };
