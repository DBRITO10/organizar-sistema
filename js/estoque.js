import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, increment 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let dbState = { fornecedores: {}, produtos: {}, enderecos: [], volumes: [] };
let usernameDB = "Usuário";
let userRole = "leitor";

onAuthStateChanged(auth, async user => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            usernameDB = data.nomeCompleto || "Usuário";
            userRole = (data.role || "leitor").toLowerCase();
            const btnEnd = document.getElementById("btnNovoEnd");
            if(btnEnd) btnEnd.style.display = (userRole === 'admin') ? 'block' : 'none';
        }
        const display = document.getElementById("userDisplay");
        if(display) display.innerHTML = `<i class="fas fa-user-circle"></i> ${usernameDB} (${userRole.toUpperCase()})`;
        loadAll(); 
    } else { window.location.href = "index.html"; }
});

async function loadAll() {
    try {
        const [fS, pS, eS, vS] = await Promise.all([
            getDocs(collection(db, "fornecedores")),
            getDocs(collection(db, "produtos")),
            getDocs(query(collection(db, "enderecos"), orderBy("rua"), orderBy("modulo"))),
            getDocs(collection(db, "volumes"))
        ]);
        dbState.fornecedores = {};
        const selForn = document.getElementById("filtroForn");
        if(selForn) selForn.innerHTML = '<option value="">Todos os Fornecedores</option>';
        fS.forEach(d => {
            dbState.fornecedores[d.id] = d.data().nome;
            if(selForn) selForn.innerHTML += `<option value="${d.id}">${d.data().nome}</option>`;
        });
        dbState.produtos = {};
        pS.forEach(d => {
            const p = d.data();
            dbState.produtos[d.id] = { 
                nome: p.nome, fornId: p.fornecedorId, fornNome: dbState.fornecedores[p.fornecedorId] || "---", codigo: p.codigo || "S/C"
            };
        });
        dbState.enderecos = eS.docs.map(d => ({ id: d.id, ...d.data() }));
        dbState.volumes = vS.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarTudo();
    } catch (e) { console.error("Erro ao carregar dados:", e); }
}

window.filtrarEstoque = () => renderizarTudo();
window.limparFiltros = () => {
    document.getElementById("filtroCod").value = "";
    document.getElementById("filtroForn").value = "";
    document.getElementById("filtroDesc").value = "";
    renderizarTudo();
};

function renderizarTudo() {
    const fCod = document.getElementById("filtroCod").value.toUpperCase();
    const fForn = document.getElementById("filtroForn").value;
    const fDesc = document.getElementById("filtroDesc").value.toUpperCase();

    const areaPendentes = document.getElementById("listaPendentes");
    const pendentes = dbState.volumes.filter(v => {
        const p = dbState.produtos[v.produtoId] || {};
        const condicao = v.quantidade > 0 && (!v.enderecoId || v.enderecoId === "");
        return condicao && (!fCod || p.codigo?.includes(fCod) || v.codigo?.includes(fCod)) &&
                          (!fForn || p.fornId === fForn) &&
                          (!fDesc || p.nome?.includes(fDesc) || v.descricao?.includes(fDesc));
    });
    document.getElementById("countPendentes").innerText = pendentes.length;
    areaPendentes.innerHTML = pendentes.map(v => {
        const p = dbState.produtos[v.produtoId] || {nome: "---", fornNome: "---", codigo: "---"};
        return `
            <div class="vol-item-pendente" style="background:#fff; padding:10px; border-radius:8px; margin-bottom:10px; border-left:4px solid var(--warning); display:flex; justify-content:space-between; align-items:center; border: 1px solid var(--border);">
                <div style="flex:1">
                    <small style="color:black; font-weight:bold;">${p.fornNome} | M: ${p.codigo}</small><br>
                    <strong style="color:black; font-size:13px;">${p.nome}</strong><br>
                    <small style="color:#333;">SKU: ${v.codigo} | ${v.descricao} | <b style="color:var(--primary);">Qtd: ${v.quantidade}</b></small>
                </div>
                ${userRole !== 'leitor' ? `
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        <button onclick="window.abrirModalMover('${v.id}')" class="btn-mover">GUARDAR</button>
                        <button onclick="window.abrirModalSaida('${v.id}')" class="btn-danger">SAÍDA</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    const grid = document.getElementById("gridEnderecos");
    grid.innerHTML = "";
    let totalVisiveis = 0;

    dbState.enderecos.forEach(end => {
        const volsNoEndereco = dbState.volumes.filter(v => {
            const p = dbState.produtos[v.produtoId] || {};
            const noLocal = v.enderecoId === end.id && v.quantidade > 0;
            return noLocal && (!fCod || p.codigo?.includes(fCod) || v.codigo?.includes(fCod)) &&
                            (!fForn || p.fornId === fForn) &&
                            (!fDesc || p.nome?.includes(fDesc) || v.descricao?.includes(fDesc));
        });

        if (volsNoEndereco.length > 0 || (!fCod && !fForn && !fDesc)) {
            totalVisiveis++;
            const totalQtdEnd = volsNoEndereco.reduce((acc, v) => acc + v.quantidade, 0);
            const card = document.createElement('div');
            card.className = "card-endereco";
            
            card.onclick = () => window.abrirDetalhesEndereco(end.id);

            card.innerHTML = `
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; padding: 10px;">
                    <span>RUA ${end.rua} - MOD ${end.modulo}</span>
                    ${userRole === 'admin' ? `<i class="fas fa-trash" onclick="event.stopPropagation(); window.deletarLocal('${end.id}')" style="cursor:pointer; opacity:0.8;"></i>` : ''}
                </div>
                <div style="padding: 20px; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold;">Volume Total</div>
                    <div style="font-size: 32px; color: var(--primary); font-weight: bold; margin: 5px 0;">${totalQtdEnd}</div>
                    <div style="font-size: 12px; color: #888;">${volsNoEndereco.length} itens distintos</div>
                </div>
                <div style="background: #f8f9fa; padding: 8px; text-align: center; font-size: 11px; color: var(--primary); border-top: 1px solid #eee; font-weight:bold;">
                    DETALHES <i class="fas fa-chevron-right"></i>
                </div>
            `;
            grid.appendChild(card);
        }
    });
    document.getElementById("countDisplay").innerText = totalVisiveis;
}

window.abrirDetalhesEndereco = (endId) => {
    dbState.ultimoEnderecoAberto = { id: endId }; 
    const volumes = dbState.volumes.filter(v => v.enderecoId === endId && v.quantidade > 0);
    const end = dbState.enderecos.find(e => e.id === endId);
    
    let htmlVols = volumes.map(v => {
        const p = dbState.produtos[v.produtoId] || {nome:"---", fornNome:"---", codigo: "---"};
        return `
            <div class="vol-item">
                <div style="flex:1">
                    <small><b>${p.fornNome}</b> | M: <b>${p.codigo}</b></small><br>
                    <strong>${p.nome}</strong><br>
                    <small>SKU: <b>${v.codigo}</b> | ${v.descricao} | Qtd: <b>${v.quantidade}</b></small>
                </div>
                ${userRole !== 'leitor' ? `
                    <div class="actions">
                        <button onclick="window.abrirModalMover('${v.id}')" title="Mover"><i class="fas fa-exchange-alt"></i></button>
                        <button onclick="window.abrirModalSaida('${v.id}')" style="color:var(--danger)" title="Saída"><i class="fas fa-sign-out-alt"></i></button>
                    </div>
                ` : ''}
            </div>`;
    }).join('');

    openModalBase(`Endereço: RUA ${end.rua} - MOD ${end.modulo}`, `
        <div style="max-height: 400px; overflow-y: auto;">
            ${htmlVols.length > 0 ? htmlVols : '<div style="text-align:center; padding:15px; color:#999;">Vazio</div>'}
        </div>
    `, () => window.fecharModal());
    
    document.querySelector("#modalMaster button[onclick='window.fecharModal()']").style.display = "none";
    document.querySelector("#modalMaster .btn-primary").innerText = "Fechar";
};

window.abrirModalNovoEnd = () => {
    openModalBase("Cadastrar Novo Endereço", `
        <label>Rua (Ex: PRT):</label>
        <input type="text" id="nRua" style="width:100%; text-transform:uppercase;">
        <label>Módulo (Ex: 1):</label>
        <input type="number" id="nModulo" style="width:100%;">
    `, async () => {
        const rua = document.getElementById("nRua").value.trim().toUpperCase();
        const mod = document.getElementById("nModulo").value.trim();
        if(!rua || !mod) return alert("Preencha Rua e Módulo!");
        try {
            await addDoc(collection(db, "enderecos"), { rua: rua, modulo: mod });
            window.fecharModal();
        } catch(e) { alert("Erro ao salvar endereço"); }
    });
};

window.abrirModalMover = (volId) => {
    const vol = dbState.volumes.find(v => v.id === volId);
    const p = dbState.produtos[vol.produtoId];
    const endsFiltrados = dbState.enderecos.filter(e => e.id !== vol.enderecoId);

    openModalBase("Movimentar / Guardar", `
        <input type="hidden" id="modalVolId" value="${volId}">
        <p style="font-size:13px; background:#f9f9f9; padding:10px; border-radius:5px;">
            <b>Item:</b> ${p.nome}<br>
            <b>SKU:</b> ${vol.codigo}<br>
            <b>Disponível:</b> ${vol.quantidade}
        </p>
        <label>Quantidade a Mover (Máx ${vol.quantidade}):</label>
        <input type="number" id="qtdMover" value="${vol.quantidade}" min="1" max="${vol.quantidade}" style="width:100%;">
        <label>Endereço de Destino:</label>
        <select id="selDestino" style="width:100%;">
            <option value="">-- Selecione o Endereço --</option>
            ${endsFiltrados.map(e => `<option value="${e.id}">RUA ${e.rua} - MOD ${e.modulo}</option>`).join('')}
        </select>
    `, window.confirmarMovimento);
    document.querySelector("#modalMaster .btn-primary").innerText = "Confirmar";
};

window.confirmarMovimento = async () => {
    const volId = document.getElementById("modalVolId").value;
    const destId = document.getElementById("selDestino").value;
    const inputQtd = document.getElementById("qtdMover");
    const qtd = parseInt(inputQtd.value);
    
    const vol = dbState.volumes.find(v => v.id === volId);
    if(!destId) return alert("Selecione um destino!");
    if(qtd <= 0 || qtd > vol.quantidade) return alert("Quantidade inválida ou maior que o disponível!");

    const endOrigem = dbState.enderecos.find(e => e.id === vol.enderecoId) || {rua:"PENDENTE", modulo:""};
    const endDest = dbState.enderecos.find(e => e.id === destId);
    
    try {
        const existente = dbState.volumes.find(v => v.enderecoId === destId && v.produtoId === vol.produtoId && v.codigo === vol.codigo);
        if(existente) await updateDoc(doc(db, "volumes", existente.id), { quantidade: increment(qtd) });
        else {
            const novo = {...vol}; delete novo.id;
            await addDoc(collection(db, "volumes"), { ...novo, quantidade: qtd, enderecoId: destId });
        }

        if(qtd === vol.quantidade) await deleteDoc(doc(db, "volumes", volId));
        else await updateDoc(doc(db, "volumes", volId), { quantidade: increment(-qtd) });

        await addDoc(collection(db, "movimentacoes"), {
            tipo: "Transferência", produto: vol.descricao, quantidade: qtd, usuario: usernameDB, data: serverTimestamp(),
            de: endOrigem.modulo ? `RUA ${endOrigem.rua} MOD ${endOrigem.modulo}` : "PENDENTE", 
            para: `RUA ${endDest.rua} MOD ${endDest.modulo}`
        });

        await window.fecharModal(); // Adicionado await aqui
    } catch(e) { alert("Erro ao mover"); }
};

window.abrirModalSaida = (volId) => {
    const vol = dbState.volumes.find(v => v.id === volId);
    const p = dbState.produtos[vol.produtoId];

    openModalBase("Dar Saída (Baixa)", `
        <input type="hidden" id="modalVolIdSaida" value="${volId}">
        <p style="font-size:13px; background:#fff0f0; padding:10px; border-radius:5px;">
            <b>Item:</b> ${p.nome}<br>
            <b>Disponível:</b> ${vol.quantidade}
        </p>
        <label>Quantidade de Saída:</label>
        <input type="number" id="qtdSaida" value="${vol.quantidade}" min="1" max="${vol.quantidade}" style="width:100%;">
    `, window.confirmarSaida);
    document.querySelector("#modalMaster .btn-primary").innerText = "Confirmar Saída";
};

window.confirmarSaida = async () => {
    const volId = document.getElementById("modalVolIdSaida").value;
    const qtd = parseInt(document.getElementById("qtdSaida").value);
    const vol = dbState.volumes.find(v => v.id === volId);

    if(qtd <= 0 || qtd > vol.quantidade) return alert("Quantidade inválida!");

    if(confirm(`Confirmar saída de ${qtd} unidades?`)) {
        try {
            if(qtd === vol.quantidade) await deleteDoc(doc(db, "volumes", volId));
            else await updateDoc(doc(db, "volumes", volId), { quantidade: increment(-qtd) });
            
            await addDoc(collection(db, "movimentacoes"), {
                tipo: "Saída", produto: vol.descricao, quantidade: qtd, usuario: usernameDB, data: serverTimestamp(),
                de: vol.enderecoId ? "ESTOQUE" : "PENDENTE", para: "BAIXA"
            });
            await window.fecharModal(); // Adicionado await aqui
        } catch(e) { alert("Erro na saída"); }
    }
};

window.deletarLocal = async (id) => {
    if(userRole !== 'admin') return;
    const temItens = dbState.volumes.some(v => v.enderecoId === id && v.quantidade > 0);
    if(temItens) return alert("Não é possível excluir um endereço que contém produtos!");
    if(confirm("Deseja excluir este local permanentemente?")) {
        await deleteDoc(doc(db, "enderecos", id));
        loadAll();
    }
};

function openModalBase(title, html, confirmAction) {
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalBody").innerHTML = html;
    document.getElementById("modalMaster").style.display = "flex";
    document.querySelector("#modalMaster button[onclick='window.fecharModal()']").style.display = "block"; 
    document.querySelector("#modalMaster .btn-primary").onclick = confirmAction;
}

window.fecharModal = async () => {
    const modalTitle = document.getElementById("modalTitle").innerText;
    document.getElementById("modalMaster").style.display = "none";
    await loadAll();
    
    if ((modalTitle.includes("Movimentar") || modalTitle.includes("Saída")) && dbState.ultimoEnderecoAberto) {
        setTimeout(() => {
            window.abrirDetalhesEndereco(dbState.ultimoEnderecoAberto.id);
        }, 100);
    } else {
        dbState.ultimoEnderecoAberto = null; 
    }
};

window.logout = () => signOut(auth).then(() => window.location.href = "index.html");
