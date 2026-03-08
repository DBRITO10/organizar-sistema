import { db, auth } from "./firebase-config.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Mova TODA a lógica de script que estava no seu HTML para cá.
// Exemplo:
function setDatasPadrao() {
    const agora = new Date();
    const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const formatar = (d) => d.toISOString().split('T')[0];
    document.getElementById("dataInicio").value = formatar(primeiroDia);
    document.getElementById("dataFim").value = formatar(agora);
}

// ... (Cole todo o resto das suas funções: processarDashboard, renderizarRank, etc) ...

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else {
        setDatasPadrao();
        processarDashboard();
    }
});

// Event listeners
document.getElementById("btnFiltrar").onclick = processarDashboard;
document.getElementById("btnSair").onclick = () => signOut(auth).then(() => window.location.href = "index.html");

// Exportar funções que precisam ser acessadas pelo DOM (como abrirDetalhes)
window.fecharModal = () => document.getElementById("modalPedidos").style.display = "none";
window.togglePedido = (id) => {
    const el = document.getElementById("det_"+id);
    el.style.display = el.style.display === "block" ? "none" : "block";
};
// ... e assim por diante
