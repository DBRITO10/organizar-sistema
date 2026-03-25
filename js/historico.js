import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let historicoCompleto = [];

function dataBrasiliaISO() {
    const agora = new Date();
    const dataBr = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
    return dataBr.toISOString().split('T')[0];
}

onAuthStateChanged(auth, async user => {
    if (user) {
        // Busca o nome do usuário na coleção 'users' usando o UID do login
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const nomeExibicao = userDoc.exists() ? userDoc.data().nomeCompleto : user.email;

        const labelUser = document.getElementById("labelUser");
        if(labelUser) labelUser.innerHTML = `<i class="fas fa-user-circle"></i> ${nomeExibicao}`;
        
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
            <td>
                <strong>${item.produto || 'Sem Descrição'}</strong><br>
                <small style="color: #666;">SKU: ${item.sku || 'N/A'}</small>
            </td>
            <td>${item.tipo || '---'}</td>
            <td><strong>${item.quantidade || 0}</strong></td>
            <td style="text-align: right; padding-right: 20px;">
                </td>
        </tr>
    `).join('');
}

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
