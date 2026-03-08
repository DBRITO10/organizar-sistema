import { db, auth } from "./firebase-config.js";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

let usuarios = [];

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else carregarUsuarios();
});

function carregarUsuarios() {
    const q = query(collection(db, "users"), orderBy("nomeCompleto", "asc"));
    onSnapshot(q, (snapshot) => {
        usuarios = [];
        snapshot.forEach(res => {
            const data = res.data();
            if (data.unidade) usuarios.push({ id: res.id, ...data });
        });
        document.getElementById("countUsers").innerText = `${usuarios.length} USUÁRIOS`;
        renderizar(usuarios);
    });
}

function renderizar(lista) {
    const cont = document.getElementById("listaUsuarios");
    cont.innerHTML = lista.length === 0 ? '<p style="text-align:center; padding:20px; color:#ddd;">Nenhum usuário com unidade cadastrada.</p>' : "";

    lista.forEach(u => {
        const card = document.createElement("div");
        card.className = `user-card ${u.role === 'admin' ? 'role-admin' : 'role-lider'}`;
        card.innerHTML = `
            <div class="user-info">
                <b>${u.nomeCompleto}</b>
                <span>${u.email}</span>
                <small>${u.unidade} — ${u.role === 'admin' ? 'Administrador' : 'Líder'}</small>
            </div>
            <div class="actions">
                <button class="btn btn-role" onclick="alterarCargo('${u.id}', '${u.role}')">
                    <i class="fas fa-sync-alt"></i> Alternar Cargo
                </button>
                <button class="btn btn-delete" onclick="removerUsuario('${u.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        cont.appendChild(card);
    });
}

window.filtrarUsers = () => {
    const txt = document.getElementById("buscaUser").value.toLowerCase();
    const filtrados = usuarios.filter(u => 
        u.nomeCompleto.toLowerCase().includes(txt) || 
        u.unidade.toLowerCase().includes(txt) ||
        u.email.toLowerCase().includes(txt)
    );
    renderizar(filtrados);
};

window.alterarCargo = async (id, roleAtual) => {
    const novoRole = roleAtual === 'admin' ? 'lider_loja' : 'admin';
    if(confirm("Alterar cargo deste colaborador?")) {
        await updateDoc(doc(db, "users", id), { role: novoRole });
    }
};

window.removerUsuario = async (id) => {
    if(confirm("Excluir este colaborador permanentemente?")) {
        await deleteDoc(doc(db, "users", id));
    }
};
