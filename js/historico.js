import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let historicoCompleto = [];

function dataBrasiliaISO() {
    const agora = new Date();
    const dataBr = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
    return dataBr.toISOString().split('T')[0];
}

onAuthStateChanged(auth, async user => {
    if (user) {
        const labelUser = document.getElementById("labelUser");
        if(labelUser) labelUser.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;
        
        const hoje = dataBrasiliaISO();
        const inputInicio = document.getElementById("filtroDataInicio");
        const inputFim = document.getElementById("filtroDataFim");
        
        if(inputInicio) inputInicio.value = hoje;
        if(inputFim) inputFim.value = hoje;
        
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
    const inputInicio = document.getElementById("filtroDataInicio");
    const inputFim = document.getElementById("filtroDataFim");
    const inputTipo = document.getElementById("filtroTipo");

    if (!inputInicio || !inputFim || !inputTipo) return;

    const dataInicio = inputInicio.value;
    const dataFim = inputFim.value;
    const tipo = inputTipo.value;

    const filtrados = historicoCompleto.filter(item => {
        if (!item.data) return false;
        const dataItem = item.data.toDate().toISOString().split('T')[0];
        const bateData = (!dataInicio || dataItem >= dataInicio) && (!dataFim || dataItem <= dataFim);
        const bateTipo = (tipo === "Todos" || item.tipo === tipo);
        return bateData && bateTipo;
    });

    renderizarTabela(filtrados);
}

function renderizarTabela(dados) {
    const tbody = document.getElementById("tabelaHist");
    if(!tbody) return;
    tbody.innerHTML = dados.map(item => `
        <tr>
            <td>${item.data ? item.data.toDate().toLocaleString('pt-BR') : '---'}</td>
            <td><small>${item.usuario || 'Sistema'}</small></td>
            <td><strong>${item.produto}</strong><br><small>${item.de} ➔ ${item.para}</small></td>
            <td><strong>${item.quantidade}</strong></td>
            <td style="text-align: right; padding-right: 20px;">
                <button class="btn-nav" style="background:#eee; color:#666; padding:5px 10px;" onclick="alert('ID: ${item.id}')">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Listeners com verificação de existência
const btnLimpar = document.getElementById("btnLimpar");
if(btnLimpar) {
    btnLimpar.onclick = () => {
        const hoje = dataBrasiliaISO();
        document.getElementById("filtroDataInicio").value = hoje;
        document.getElementById("filtroDataFim").value = hoje;
        document.getElementById("filtroTipo").value = "Todos";
        filtrarHistorico();
    };
}

const fInicio = document.getElementById("filtroDataInicio");
if(fInicio) fInicio.addEventListener("change", filtrarHistorico);

const fFim = document.getElementById("filtroDataFim");
if(fFim) fFim.addEventListener("change", filtrarHistorico);

const fTipo = document.getElementById("filtroTipo");
if(fTipo) fTipo.addEventListener("change", filtrarHistorico);

const btnLogout = document.getElementById("btnLogout");
if(btnLogout) btnLogout.onclick = () => signOut(auth).then(() => window.location.href = "index.html");
