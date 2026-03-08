import { db, auth } from "./firebase-config.js";
import { collection, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

let adminUid = null;
let idEdit = null;

onAuthStateChanged(auth, async user => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            const dadosLogado = snap.data();

            if (dadosLogado.unidade && dadosLogado.unidade.trim() !== "") {
                alert("Acesso negado: Este painel é restrito à gestão central.");
                window.location.href = "pagina.html";
                return;
            }

            if (dadosLogado.role === "admin") {
                adminUid = user.uid; 
                carregarUsuarios();
            } else { 
                window.location.href = "pagina.html"; 
            }
        }
    } else { 
        window.location.href = "index.html"; 
    }
});

async function carregarUsuarios() {
    const querySnapshot = await getDocs(collection(db, "users"));
    const tabela = document.getElementById("listaUsuarios");
    tabela.innerHTML = "";

    querySnapshot.forEach((uDoc) => {
        const d = uDoc.data();
        if (!d.unidade || d.unidade.trim() === "") {
            const id = uDoc.id;
            const role = d.role || "leitor";
            const isSelf = id === adminUid;
            const targetIsOtherAdmin = role === "admin" && !isSelf;

            let botoes = "";
            
            if (isSelf) {
                botoes = `<button class="btn-action btn-edit" onclick="window.modalNome('${id}','${d.nomeCompleto}')" title="Editar Meu Nome"><i class="fas fa-pen"></i></button>`;
            } 
            else if (!targetIsOtherAdmin) {
                botoes += `<button class="btn-action btn-edit" onclick="window.modalNome('${id}','${d.nomeCompleto}')" title="Editar Nome"><i class="fas fa-pen"></i></button>`;
                if (role === "leitor") botoes += `<button class="btn-action btn-up" onclick="window.mudarCargo('${id}','operador')" title="Subir p/ Operador"><i class="fas fa-arrow-up"></i></button>`;
                if (role === "operador") botoes += `<button class="btn-action btn-down" onclick="window.mudarCargo('${id}','leitor')" title="Rebaixar p/ Leitor"><i class="fas fa-arrow-down"></i></button>`;
                botoes += `<button class="btn-action btn-up" style="background:var(--primary)" onclick="window.mudarCargo('${id}','admin')" title="Tornar Admin"><i class="fas fa-user-shield"></i></button>`;
            }

            tabela.innerHTML += `
                <tr>
                    <td>
                        <strong>${d.nomeCompleto}</strong> ${isSelf ? '<span style="font-size:10px; opacity:0.5; margin-left:5px;">(VOCÊ)</span>' : ''}<br>
                        <small style="opacity:0.5">${d.email}</small>
                    </td>
                    <td><span class="badge ${role}">${role}</span></td>
                    <td>
                        <div class="btn-group">
                            ${targetIsOtherAdmin ? '<i class="fas fa-lock" title="Admin Protegido" style="opacity:0.3"></i>' : botoes}
                        </div>
                    </td>
                </tr>`;
        }
    });
}

window.modalNome = (id, nome) => { 
    idEdit = id; 
    document.getElementById("inputNome").value = nome; 
    document.getElementById("modalNome").style.display = "flex"; 
};

window.fecharModal = () => { document.getElementById("modalNome").style.display = "none"; };

document.getElementById("btnSalvarNome").onclick = async () => {
    const n = document.getElementById("inputNome").value.trim();
    if(n && idEdit) { 
        try {
            await updateDoc(doc(db, "users", idEdit), { nomeCompleto: n }); 
            window.fecharModal(); 
            carregarUsuarios(); 
        } catch (e) { alert("Erro ao atualizar nome."); }
    }
};

window.mudarCargo = async (uid, novo) => {
    const acao = novo === 'leitor' ? "REBAIXAR" : "PROMOVER";
    if(confirm(`Deseja ${acao} este usuário para ${novo.toUpperCase()}?`)) {
        await updateDoc(doc(db, "users", uid), { role: novo });
        carregarUsuarios();
    }
};

window.sairImediato = () => signOut(auth).then(() => window.location.href = "index.html");
