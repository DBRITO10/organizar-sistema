import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let historicoCompleto = [];
let userRole = "leitor";

// Função para pegar a data atual no fuso de Brasília (YYYY-MM-DD)
function dataBrasiliaISO() {
    const agora = new Date();
    // Offset de Brasília é UTC-3
    const dataBr = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
    return dataBr.toISOString().split('T')[0];
}

onAuthStateChanged(auth, async user => {
    if (user) {
        document.getElementById("labelUser").innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;
        
        // Configura datas padrão (Hoje)
        const hoje = dataBrasiliaISO();
        document.getElementById("filtroDataInicio").value = hoje;
        document.getElementById("filtroDataFim").value = hoje;
        
        carregarDados();
    } else {
        window.location.href = "index.html";
    }
});

async function carregarDados() {
    try {
        const q = query(collection(db, "movimentacoes"), orderBy("data", "desc"), limit(500));
        const querySnapshot = await getDocs(q);
        historicoCompleto = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        filtrarHistorico();
    } catch (e) {
        console.error("Erro ao carregar:", e);
    }
}

function filtrarHistorico() {
    const dataInicio = document.getElementById("filtroDataInicio").value;
    const dataFim = document.getElementById("filtroDataFim").value;
    const tipo = document.getElementById("filtroTipo").value;

    const filtrados = historicoCompleto.filter(item => {
        if (!item.data) return false;
        
        // Converte o timestamp do Firestore para YYYY-MM-DD
        const dataItem = item.data.toDate().toISOString().split('T')[0];
        
        const bateData = (!dataInicio || dataItem >= dataInicio) && (!dataFim || dataItem <= dataFim);
        const bateTipo = (tipo === "Todos" || item.tipo === tipo);
        
        return bateData && bateTipo;
    });

    renderizarTabela(filtrados);
}

function renderizarTabela(dados) {
    const tbody = document.getElementById("tabelaHist");
    tbody.innerHTML = dados.map(item => `
        <tr>
            <td>${item.data ? item.data.toDate().toLocaleString('pt-BR') : '---'}</td>
            <td><small>${item.usuario || 'Sistema'}</small></td>
            <td><strong>${item.produto}</strong><br><small>${item.de} ➔ ${item.para}</small></td>
            <td class="tipo-${item.tipo.replace(/\s+/g, '-')}">${item.tipo}</td>
            <td><strong>${item.quantidade}</strong></td>
            <td style="text-align: right; padding-right: 20px;">
                <button class="btn-nav" style="background:#eee; color:#666; padding:5px 10px;" onclick="alert('ID: ${item.id}')">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Eventos de Filtro
document.getElementById("filtroDataInicio").addEventListener("change", filtrarHistorico);
document.getElementById("filtroDataFim").addEventListener("change", filtrarHistorico);
document.getElementById("filtroTipo").addEventListener("change", filtrarHistorico);

document.getElementById("btnLimpar").onclick = () => {
    const hoje = dataBrasiliaISO();
    document.getElementById("filtroDataInicio").value = hoje;
    document.getElementById("filtroDataFim").value = hoje;
    document.getElementById("filtroTipo").value = "Todos";
    filtrarHistorico();
};

document.getElementById("btnLogout").onclick = () => signOut(auth).then(() => window.location.href = "index.html");
