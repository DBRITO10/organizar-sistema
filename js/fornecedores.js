import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let userRole = "leitor";

// --- CONTROLE DE ACESSO ---
onAuthStateChanged(auth, async user => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            userRole = (data.role || "leitor").toLowerCase();
            if (userRole !== "admin") {
                alert("Acesso restrito a administradores.");
                window.location.href = "pagina.html";
                return;
            }
            const userName = data.nomeCompleto || "ADMIN";
            document.getElementById("labelUser").innerHTML = `<i class="fas fa-user-circle"></i> ${userName} (ADMIN)`;
        }
        carregar();
    } else {
        window.location.href = "index.html";
    }
});

// Logout rápido
document.getElementById("btnLogout").onclick = () => signOut(auth).then(() => window.location.href = "index.html");

// --- FUNÇÕES DE MÁSCARA (MELHORADAS) ---
const mascaraCNPJ = (value) => {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
};

const mascaraTelefone = (value) => {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .replace(/(-\d{4})\d+?$/, "$1");
};

// Aplicar máscaras nos inputs de cadastro
document.getElementById("cnpjF").addEventListener("input", (e) => e.target.value = mascaraCNPJ(e.target.value));
document.getElementById("telF").addEventListener("input", (e) => e.target.value = mascaraTelefone(e.target.value));

// Aplicar máscaras nos inputs de edição
document.getElementById("editCnpj").addEventListener("input", (e) => e.target.value = mascaraCNPJ(e.target.value));
document.getElementById("editTel").addEventListener("input", (e) => e.target.value = mascaraTelefone(e.target.value));


async function carregar() {
    const querySnapshot = await getDocs(collection(db, "fornecedores"));
    const listaF = document.getElementById("listaF");
    listaF.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
        const f = docSnap.data();
        const fId = docSnap.id;
        const fJson = encodeURIComponent(JSON.stringify(f));

        listaF.innerHTML += `
            <tr>
                <td style="padding-left: 25px;"><strong>${f.nome}</strong></td>
                <td>${f.cnpj || '---'}</td>
                <td>${f.email || '---'}</td>
                <td>${f.telefone || '---'}</td>
                <td style="text-align: right; padding-right: 25px;">
                    <button onclick="window.abrirEdicao('${fId}', '${fJson}')" class="btn-action" style="background: var(--warning);"><i class="fas fa-edit"></i></button>
                    <button onclick="window.excluirF('${fId}', '${f.nome}')" class="btn-action" style="background: var(--danger);"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

window.salvarF = async () => {
    const nome = document.getElementById("nomeF").value.toUpperCase();
    const cnpj = document.getElementById("cnpjF").value;
    const email = document.getElementById("emailF").value.toLowerCase();
    const tel = document.getElementById("telF").value;

    if (!nome) return alert("O nome é obrigatório!");

    await addDoc(collection(db, "fornecedores"), {
        nome, cnpj, email, telefone: tel
    });

    limparCampos();
    carregar();
};

window.abrirEdicao = (id, fJsonEncoded) => {
    const f = JSON.parse(decodeURIComponent(fJsonEncoded));
    
    document.getElementById("editNome").value = f.nome;
    document.getElementById("editCnpj").value = f.cnpj || "";
    document.getElementById("editEmail").value = f.email || "";
    document.getElementById("editTel").value = f.telefone || "";
    
    document.getElementById("modalEdit").style.display = "flex";
    
    document.getElementById("btnConfirmarEdit").onclick = async () => {
        await updateDoc(doc(db, "fornecedores", id), {
            nome: document.getElementById("editNome").value.toUpperCase(),
            cnpj: document.getElementById("editCnpj").value,
            email: document.getElementById("editEmail").value.toLowerCase(),
            telefone: document.getElementById("editTel").value
        });
        window.fecharModal();
        carregar();
    };
};

window.fecharModal = () => document.getElementById("modalEdit").style.display = "none";

window.excluirF = async (id, nome) => {
    if(confirm(`Deseja remover permanentemente o fornecedor ${nome}?`)) {
        await deleteDoc(doc(db, "fornecedores", id));
        carregar();
    }
};

function limparCampos() {
    document.getElementById("nomeF").value = "";
    document.getElementById("cnpjF").value = "";
    document.getElementById("emailF").value = "";
    document.getElementById("telF").value = "";
}
