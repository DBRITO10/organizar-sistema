    import { db, auth } from "./firebase-config.js";
    import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
    import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

    // --- LÓGICA PRESERVADA INTEGRALMENTE ---
    let todosProdutos = [];

    onAuthStateChanged(auth, (user) => {
        if (!user) window.location.href = "index.html";
        else carregarProdutos();
    });

    function carregarProdutos() {
        const q = query(collection(db, "produtos_transbordo"), orderBy("desc", "asc"));
        onSnapshot(q, (snapshot) => {
            todosProdutos = [];
            snapshot.forEach(doc => todosProdutos.push({ id: doc.id, ...doc.data() }));
            renderizar(todosProdutos);
        });
    }

    window.salvarProduto = async () => {
        const id = document.getElementById("editId").value;
        const p = {
            fornecedor: document.getElementById("f").value.toUpperCase(),
            codigo: document.getElementById("c").value,
            desc: document.getElementById("d").value.toUpperCase(),
            valor: parseFloat(document.getElementById("v").value || 0),
            qtd: parseInt(document.getElementById("q").value || 0)
        };

        if(!p.fornecedor || !p.codigo || !p.desc) return alert("Preencha os campos obrigatórios!");

        try {
            if(id) {
                await updateDoc(doc(db, "produtos_transbordo", id), p);
                alert("Atualizado!");
                cancelarEdicao();
            } else {
                await addDoc(collection(db, "produtos_transbordo"), p);
                alert("Cadastrado!");
                limparCampos();
            }
        } catch (e) { alert("Erro ao salvar"); }
    };

    function renderizar(lista) {
        const html = lista.map(p => `
            <tr>
                <td>${p.fornecedor}</td>
                <td>${p.codigo}</td>
                <td>${p.desc}</td>
                <td>R$ ${p.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td style="font-weight:bold; color:${p.qtd > 0 ? 'var(--success)' : '#ff4d4d'}">${p.qtd}</td>
                <td>
                    <button class="btn-acao btn-entrada" onclick="darEntrada('${p.id}')" title="Dar Entrada">+ QTD</button>
                    <button class="btn-acao btn-edit" onclick="prepararEdicao('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-acao btn-del" onclick="excluir('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
        document.getElementById("corpoTabela").innerHTML = html;
    }

    window.filtrar = () => {
        const t = document.getElementById("inputBusca").value.toLowerCase();
        const filtrados = todosProdutos.filter(p => p.desc.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t));
        renderizar(filtrados);
    };

    window.excluir = async (id) => {
        if(confirm("Excluir este produto permanentemente?")) await deleteDoc(doc(db, "produtos_transbordo", id));
    };

    window.darEntrada = async (id) => {
        const qtdAdicional = prompt("Quantas unidades deseja ADICIONAR ao estoque atual?");
        if(!qtdAdicional || isNaN(qtdAdicional)) return;
        const p = todosProdutos.find(x => x.id === id);
        await updateDoc(doc(db, "produtos_transbordo", id), { qtd: p.qtd + parseInt(qtdAdicional) });
        alert("Estoque atualizado!");
    };

    window.prepararEdicao = (id) => {
        const p = todosProdutos.find(x => x.id === id);
        document.getElementById("f").value = p.fornecedor;
        document.getElementById("c").value = p.codigo;
        document.getElementById("d").value = p.desc;
        document.getElementById("v").value = p.valor;
        document.getElementById("q").value = p.qtd;
        document.getElementById("editId").value = id;
        document.getElementById("formTitle").innerText = "Editando: " + p.desc;
        document.getElementById("btnPrincipal").innerText = "ATUALIZAR CADASTRO";
        document.getElementById("btnCancelaEdit").style.display = "block";
        window.scrollTo(0,0);
    };

    window.cancelarEdicao = () => {
        limparCampos();
        document.getElementById("editId").value = "";
        document.getElementById("formTitle").innerText = "Novo Cadastro / Entrada";
        document.getElementById("btnPrincipal").innerText = "SALVAR NA VITRINE";
        document.getElementById("btnCancelaEdit").style.display = "none";
    };

    function limparCampos() {
        ["f","c","d","v","q"].forEach(id => document.getElementById(id).value = (id === "q" ? "0" : ""));
    }

    document.getElementById("btnLogout").onclick = () => signOut(auth).then(() => window.location.href = "index.html");
