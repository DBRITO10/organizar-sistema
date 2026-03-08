import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    collection, addDoc, getDocs, serverTimestamp, doc, getDoc,
    updateDoc, deleteDoc, increment, query, where 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let fornecedoresCache = {};
let userRole = "leitor";
let usernameDB = "Usuário";

onAuthStateChanged(auth, async user => {
    if (user) {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            const d = userSnap.data();
            userRole = (d.role || "leitor").toLowerCase();
            usernameDB = d.nomeCompleto || "Usuário";
            if(userRole === "admin") {
                const btnProd = document.getElementById("btnAbrirModalProd");
                if(btnProd) btnProd.style.display = "block";
            }
        }
        document.getElementById("userDisplay").innerHTML = `<i class="fas fa-user-shield"></i> ${usernameDB}`;
        init();
    } else { window.location.href = "index.html"; }
});

async function init() {
    const fSnap = await getDocs(collection(db, "fornecedores"));
    const selForn = document.getElementById("filtroForn");
    selForn.innerHTML = '<option value="">Todos os Fornecedores</option>';
    fSnap.forEach(d => {
        fornecedoresCache[d.id] = d.data().nome;
        selForn.innerHTML += `<option value="${d.id}">${d.data().nome}</option>`;
    });
    renderizar();
}

window.filtrar = () => renderizar();
window.limparFiltros = () => { location.reload(); };

async function renderizar() {
    const fForn = document.getElementById("filtroForn").value;
    const fCod = document.getElementById("filtroCod").value.toUpperCase();
    const fDesc = document.getElementById("filtroDesc").value.toUpperCase();

    const [pSnap, vSnap] = await Promise.all([
        getDocs(collection(db, "produtos")),
        getDocs(collection(db, "volumes"))
    ]);

    const tbody = document.getElementById("tblEstoque");
    tbody.innerHTML = "";

    let produtosLista = [];
    pSnap.forEach(docP => {
        const p = docP.data();
        produtosLista.push({ id: docP.id, ...p, fornecedorNome: fornecedoresCache[p.fornecedorId] || '---' });
    });

    produtosLista.sort((a, b) => {
        const compForn = a.fornecedorNome.localeCompare(b.fornecedorNome);
        if (compForn !== 0) return compForn;
        return (a.codigo || "").localeCompare(b.codigo || "");
    });

    produtosLista.forEach(p => {
        const pId = p.id;
        let volsAgrupados = {};
        vSnap.forEach(vDoc => {
            const v = vDoc.data();
            if(v.produtoId === pId) {
                const sku = v.codigo.trim().toUpperCase();
                if(!volsAgrupados[sku]) {
                    volsAgrupados[sku] = { idOriginal: vDoc.id, codigo: v.codigo, descricao: v.descricao, quantidade: 0 };
                }
                volsAgrupados[sku].quantidade += (v.quantidade || 0);
            }
        });

        const listaVols = Object.values(volsAgrupados);
        const totalGeral = listaVols.reduce((acc, v) => acc + v.quantidade, 0);

        if ((!fForn || p.fornecedorId === fForn) && 
            (!fDesc || p.nome.toUpperCase().includes(fDesc)) &&
            (!fCod || p.codigo.toUpperCase().includes(fCod) || listaVols.some(v => v.codigo.toUpperCase().includes(fCod)))) {

            tbody.innerHTML += `
                <tr data-id="${pId}">
                    <td onclick="window.toggleVols('${pId}')" style="cursor:pointer; text-align:center;"><i class="fas fa-chevron-right"></i></td>
                    <td>${p.fornecedorNome}</td>
                    <td><b>${p.codigo || '---'}</b></td>
                    <td>${p.nome}</td>
                    <td style="text-align:center"><strong>${totalGeral}</strong></td>
                    <td style="text-align:right">
                        ${userRole !== 'leitor' ? `<button class="btn-action" style="background:var(--info)" onclick="window.modalNovoSKU('${pId}', '${p.nome}')">CRIAR SKU</button>` : ''}
                        ${userRole === 'admin' ? `
                            <button class="btn-action" style="background:var(--warning)" onclick="window.modalEditarProd('${pId}', '${p.nome}', '${p.codigo}', '${p.fornecedorId}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-action" style="background:var(--danger)" onclick="window.tentarExcluirProduto('${pId}', '${p.nome}', ${totalGeral})"><i class="fas fa-trash"></i></button>
                        ` : ''}
                    </td>
                </tr>
            `;

            listaVols.forEach(v => {
                tbody.innerHTML += `
                    <tr class="child-row child-${pId}">
                        <td></td>
                        <td colspan="2" style="font-size:0.8rem; color:var(--primary); padding-left:20px;">↳ SKU: ${v.codigo}</td>
                        <td style="font-size:0.8rem;">${v.descricao}</td>
                        <td style="text-align:center; font-weight:bold; background:#f0f9ff;">${v.quantidade}</td>
                        <td style="text-align:right">
                            ${userRole !== 'leitor' ? `<button class="btn-action" style="background:var(--success)" onclick="window.modalEntrada('${v.idOriginal}', '${v.descricao}')">ENTRADA</button>` : ''}
                            ${userRole === 'admin' ? `
                                <button class="btn-action" style="background:var(--warning)" onclick="window.modalEditarVolume('${v.idOriginal}', '${v.codigo}', '${v.descricao}')"><i class="fas fa-edit"></i></button>
                                <button class="btn-action" style="background:var(--danger)" onclick="window.tentarExcluirVolume('${v.idOriginal}', '${v.descricao}', ${v.quantidade})"><i class="fas fa-times"></i></button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });
        }
    });
}

// TRAVA: Não excluir produto master com saldo
window.tentarExcluirProduto = async (pId, nome, total) => {
    if(total > 0) {
        await addDoc(collection(db, "movimentacoes"), {
            tipo: "Tentativa de Exclusão Bloqueada", produto: nome, detalhes: `Bloqueado: Produto com saldo de ${total}`,
            usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
        });
        return alert(`Ação Bloqueada! O produto ${nome} possui ${total} unidades em estoque.`);
    }
    window.deletar(pId, 'produtos', nome);
};

// NOVA TRAVA: Não excluir SKU/Volume com saldo (MESMA LÓGICA DO PRODUTO)
window.tentarExcluirVolume = async (vId, desc, qtd) => {
    if(qtd > 0) {
        await addDoc(collection(db, "movimentacoes"), {
            tipo: "Tentativa de Exclusão Bloqueada", produto: desc, detalhes: `Bloqueado: SKU com saldo de ${qtd}`,
            usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
        });
        return alert(`Ação Bloqueada! O volume "${desc}" possui ${qtd} unidades em saldo no estoque.`);
    }
    window.deletar(vId, 'volumes', desc);
};

window.modalEntrada = (vId, vDesc) => {
    openModal(`Nova Entrada: ${vDesc}`, `<label>Quantidade:</label><input type="number" id="addQ" value="1">`, async () => {
        const q = parseInt(document.getElementById("addQ").value);
        if(q <= 0) return alert("Qtd inválida");
        const vSnap = await getDoc(doc(db, "volumes", vId));
        const vData = vSnap.data();
        await addDoc(collection(db, "volumes"), {
            produtoId: vData.produtoId, codigo: vData.codigo, descricao: vData.descricao,
            quantidade: q, enderecoId: "", dataAlt: serverTimestamp()
        });
        await addDoc(collection(db, "movimentacoes"), {
            tipo: "Entrada", produto: vDesc, sku: vData.codigo, quantidade: q,
            usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
        });
        fecharModal(); renderizar();
    });
};

window.modalEditarProd = (id, nomeAntigo, codAntigo, fornId) => {
    let opts = "";
    Object.entries(fornecedoresCache).forEach(([fid, fnome]) => {
        opts += `<option value="${fid}" ${fid === fornId ? 'selected' : ''}>${fnome}</option>`;
    });
    openModal("Editar Produto", `
        <label>Fornecedor:</label><select id="eForn">${opts}</select>
        <label>Código Master:</label><input type="text" id="eCod" value="${codAntigo}">
        <label>Nome:</label><input type="text" id="eNome" value="${nomeAntigo}">
    `, async () => {
        const novoCod = document.getElementById("eCod").value.toUpperCase();
        const novoNome = document.getElementById("eNome").value.toUpperCase();
        await updateDoc(doc(db, "produtos", id), {
            fornecedorId: document.getElementById("eForn").value,
            codigo: novoCod, nome: novoNome
        });
        await addDoc(collection(db, "movimentacoes"), {
            tipo: "Edição Produto Master", produto: novoNome, sku: novoCod,
            detalhes: `Alterado de: ${nomeAntigo} (${codAntigo}) para: ${novoNome} (${novoCod})`,
            usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
        });
        fecharModal(); renderizar();
    });
};

window.modalEditarVolume = (id, skuAntigo, descAntiga) => {
    openModal("Editar SKU", `
        <label>Código SKU:</label><input type="text" id="eSKU" value="${skuAntigo}">
        <label>Descrição:</label><input type="text" id="eDesc" value="${descAntiga}">
    `, async () => {
        const novoSKU = document.getElementById("eSKU").value.toUpperCase();
        const novaDesc = document.getElementById("eDesc").value.toUpperCase();
        await updateDoc(doc(db, "volumes", id), {
            codigo: novoSKU, descricao: novaDesc
        });
        await addDoc(collection(db, "movimentacoes"), {
            tipo: "Edição de SKU", produto: novaDesc, sku: novoSKU,
            detalhes: `SKU: ${skuAntigo}->${novoSKU} | Desc: ${descAntiga}->${novaDesc}`,
            usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
        });
        fecharModal(); renderizar();
    });
};

window.deletar = async (id, tab, desc) => {
    if(confirm(`ATENÇÃO: Deseja realmente excluir "${desc}"?\nEsta ação será gravada no histórico.`)) {
        try {
            await deleteDoc(doc(db, tab, id));
            await addDoc(collection(db, "movimentacoes"), {
                tipo: tab === "produtos" ? "Exclusão Produto Master" : "Exclusão de SKU",
                produto: desc, detalhes: `O item "${desc}" foi removido do banco de dados.`,
                usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
            });
            renderizar();
        } catch (e) { alert("Erro ao excluir"); }
    }
};

window.modalNovoProduto = () => {
    let opts = '<option value="">Selecione um Fornecedor...</option>';
    Object.entries(fornecedoresCache).forEach(([fid, fnome]) => { opts += `<option value="${fid}">${fnome}</option>`; });
    openModal("Novo Produto Master", `
        <label>Fornecedor:</label><select id="nP_Forn">${opts}</select>
        <label>Código Master:</label><input type="text" id="nP_Cod">
        <label>Descrição:</label><input type="text" id="nP_Nome">
    `, async () => {
        const cod = document.getElementById("nP_Cod").value.trim().toUpperCase();
        const nome = document.getElementById("nP_Nome").value.trim().toUpperCase();
        const fornId = document.getElementById("nP_Forn").value;
        if(!cod || !nome || !fornId) return alert("Preencha todos os campos!");

        await addDoc(collection(db, "produtos"), {
            fornecedorId: fornId, codigo: cod, nome: nome, dataCriacao: serverTimestamp()
        });
        await addDoc(collection(db, "movimentacoes"), {
            tipo: "Criação Produto Master", produto: nome, sku: cod,
            usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
        });
        fecharModal(); renderizar();
    });
};

window.modalNovoSKU = (pId, pNome) => {
    openModal(`Novo SKU para: ${pNome}`, `
        <label>SKU (Código Único):</label><input type="text" id="nSKU">
        <label>Descrição Volume:</label><input type="text" id="nDesc">
        <label>Qtd Inicial:</label><input type="number" id="nQtd" value="0">
    `, async () => {
        const sku = document.getElementById("nSKU").value.trim().toUpperCase();
        const desc = document.getElementById("nDesc").value.toUpperCase();
        const qtd = parseInt(document.getElementById("nQtd").value);

        if(!sku || !desc) return alert("Preencha o SKU e a Descrição!");

        const qSku = query(collection(db, "volumes"), where("produtoId", "==", pId), where("codigo", "==", sku));
        const sSku = await getDocs(qSku);
        
        if(!sSku.empty) {
            await addDoc(collection(db, "movimentacoes"), {
                tipo: "Erro: SKU Duplicado", produto: pNome, sku: sku, detalhes: "Tentativa de criar SKU já existente",
                usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
            });
            return alert(`O SKU "${sku}" já existe para este produto!`);
        }

        await addDoc(collection(db, "volumes"), {
            produtoId: pId, codigo: sku, descricao: desc,
            quantidade: qtd, enderecoId: "", dataAlt: serverTimestamp()
        });
        await addDoc(collection(db, "movimentacoes"), {
            tipo: "Criação de SKU", produto: desc, sku: sku, quantidade: qtd,
            usuario: usernameDB, data: serverTimestamp(), origem: "Tela Produtos"
        });
        fecharModal(); renderizar();
    });
};

function openModal(title, body, action) {
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalBody").innerHTML = body;
    document.getElementById("modalMaster").style.display = "flex";
    document.getElementById("btnModalConfirm").onclick = action;
}
window.fecharModal = () => document.getElementById("modalMaster").style.display = "none";
window.toggleVols = (pId) => {
    const rows = document.querySelectorAll(`.child-${pId}`);
    const icon = document.querySelector(`tr[data-id="${pId}"] i`);
    rows.forEach(r => r.classList.toggle('active'));
    if(icon) {
        icon.classList.toggle('fa-chevron-right');
        icon.classList.toggle('fa-chevron-down');
    }
};
window.logout = () => signOut(auth).then(() => window.location.href = "index.html");
