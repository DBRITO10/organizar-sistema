import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    collection, query, orderBy, getDocs, deleteDoc, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let userRole = "leitor";
let userEmail = "";

// Função auxiliar para obter a data de hoje no formato YYYY-MM-DD
function obterDataHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

onAuthStateChanged(auth, async user => {
    if (user) {
        userEmail = user.email;
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            userRole = (data.role || "leitor").toLowerCase();
            
            if (userRole !== "admin" && userRole !== "operador") {
                alert("Acesso restrito.");
                signOut(auth).then(() => window.location.href = "index.html");
                return;
            }

            const userName = data.nomeCompleto || user.email.split('@')[0].toUpperCase();
            const label = document.getElementById("labelUser");
            if (label) label.innerHTML = `<i class="fas fa-user-circle"></i> ${userName} (${userRole.toUpperCase()})`;
        }

        // Define a data de hoje no input antes de listar o histórico
        const filtroData = document.getElementById("filtroData");
        if (filtroData) {
            filtroData.value = obterDataHoje();
        }

        listarHistorico();
    } else {
        window.location.href = "index.html";
    }
});

async function listarHistorico() {
    const tbody = document.getElementById("tabelaHist");
    if (!tbody) return; 

    try {
        const q = query(collection(db, "movimentacoes"), orderBy("data", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fData = document.getElementById("filtroData").value;
        const fTipo = document.getElementById("filtroTipo").value;

        tbody.innerHTML = "";
        let encontrou = false;

        querySnapshot.forEach((docSnap) => {
            const h = docSnap.data();
            const id = docSnap.id;
            
            const dataObj = h.data?.toDate ? h.data.toDate() : new Date();
            const dataF = dataObj.toLocaleDateString('pt-BR');
            const horaF = dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const dataISO = dataObj.toISOString().split('T')[0];

            // Filtra pela data selecionada (que agora inicia como "hoje")
            if (fData && dataISO !== fData) return;
            if (fTipo !== "Todos" && h.tipo !== fTipo) return;

            encontrou = true;
            const btnExcluir = userRole === "admin" 
                ? `<button onclick="window.excluirRegistro('${id}')" class="btn-nav" style="background:var(--danger); padding:5px 10px;"><i class="fas fa-trash"></i></button>` 
                : "";

            tbody.innerHTML += `
                <tr>
                    <td>${dataF} <br><small>${horaF}</small></td>
                    <td>${h.usuario || '---'}</td>
                    <td style="font-weight:bold; color:var(--primary)">${h.produto}</td>
                    <td class="tipo-${h.tipo}">${h.tipo}</td>
                    <td>${h.quantidade !== undefined ? h.quantidade + ' un' : '--'}</td>
                    <td style="text-align: right; padding-right:15px;">${btnExcluir}</td>
                </tr>`;
        });

        if (!encontrou) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding: 20px;'>Nenhum registro encontrado para esta data.</td></tr>";
        }

    } catch (e) {
        console.error(e);
        tbody.innerHTML = "<tr><td colspan='6' style='color:red; text-align:center;'>Erro ao carregar histórico.</td></tr>";
    }
}

window.excluirRegistro = async (id) => {
    if (userRole !== "admin") return alert("Apenas administradores.");
    if (confirm("Deseja remover este registro?")) {
        await deleteDoc(doc(db, "movimentacoes", id));
        listarHistorico();
    }
};

// Listeners para os filtros
document.getElementById("filtroData").addEventListener("change", listarHistorico);
document.getElementById("filtroTipo").addEventListener("change", listarHistorico);

// Botão Limpar: Agora reseta para a data atual
document.getElementById("btnLimpar").onclick = () => {
    document.getElementById("filtroData").value = obterDataHoje();
    document.getElementById("filtroTipo").value = "Todos";
    listarHistorico();
};

document.getElementById("btnLogout").onclick = () => signOut(auth).then(() => window.location.href = "index.html");
