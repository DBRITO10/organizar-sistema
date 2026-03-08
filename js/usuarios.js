import { db, auth } from "./firebase-config.js";
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

let idEdit = null;

// Carregar usuários
const carregarUsuarios = () => {
    onSnapshot(collection(db, "users"), (snapshot) => {
        const container = document.getElementById("listaUsuarios");
        container.innerHTML = "";
        snapshot.forEach((doc) => {
            const u = doc.data();
            container.innerHTML += `
                <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                    <span>${u.nomeCompleto} - (${u.role})</span>
                    <div>
                        <button onclick="window.modalNome('${doc.id}', '${u.nomeCompleto}')">Editar</button>
                        <button onclick="window.mudarCargo('${doc.id}', '${u.role === 'admin' ? 'leitor' : 'admin'}')">Cargo</button>
                    </div>
                </div>`;
        });
    });
};

// Funções globais necessárias para os botões do HTML
window.modalNome = (id, nome) => { 
    idEdit = id; 
    document.getElementById("inputNome").value = nome; 
    document.getElementById("modalNome").style.display = "flex"; 
};

window.fecharModal = () => { 
    document.getElementById("modalNome").style.display = "none"; 
};

document.getElementById("btnSalvarNome").onclick = async () => {
    const n = document.getElementById("inputNome").value.trim();
    if(n && idEdit) { 
        await updateDoc(doc(db, "users", idEdit), { nomeCompleto: n }); 
        window.fecharModal();
    }
};

window.mudarCargo = async (uid, novo) => {
    if(confirm(`Mudar cargo para ${novo}?`)) {
        await updateDoc(doc(db, "users", uid), { role: novo });
    }
};

carregarUsuarios();
