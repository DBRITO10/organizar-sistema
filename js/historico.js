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
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const nomeExibicao = userDoc.exists() ? userDoc.data().nomeCompleto : user.email;

        const labelUser = document.getElementById("labelUser");
        if(labelUser) labelUser.innerHTML = `<i class="fas fa-user-circle"></i> ${nomeExibicao}`;
        
        const hoje = dataBrasiliaISO();
        if(document.getElementById("filtroDataInicio")) document.getElementById("filtroDataInicio").value = hoje;
        if(document.getElementById("filtroDataFim")) document.getElementById("filtroDataFim").value = hoje;
        
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
    const termoBusca = document.getElementById("inputBusca").value.toLowerCase();

    const filtrados = historicoCompleto.filter(item => {
        if (!item.data) return false;
        const dataItem = item.data.toDate().toISOString().split('T')[0];
        const bateData = (!dataInicio || dataItem >= dataInicio) && (!dataFim || dataItem <= dataFim);
        
        // Busca na descrição montada ou no operador
        const descricaoCompleta = `${item.tipo} ${item.produto} ${item.sku} ${item.de} ${item.para}`.toLowerCase();
        const operador = (item.usuario || "").toLowerCase();
        const bateBusca = descricaoCompleta.includes(termoBusca) || operador.includes(termoBusca);

        return bateData && bateBusca;
    });

    renderizarTabela(filtrados);
}

function renderizarTabela(dados) {
    const tbody = document.getElementById("tabelaHist");
    if(!tbody) return;
    
    tbody.innerHTML = dados.map(item => {
        // Monta a frase da descrição baseada no que aconteceu
        let acaoDescricao = `<strong>${item.tipo || 'Movimentação'}:</strong> ${item.produto || 'Item'}`;
        if(item.de && item.para) acaoDescricao += `<br><small>${item.de} ➔ ${item.para}</small>`;
        if(item.sku) acaoDescricao += ` <small>(SKU: ${item.sku})</small>`;

        return `
            <tr>
                <td>${item.data ? item.data.toDate().toLocaleString('pt-BR') : '---'}</td>
                <td>${item.usuario || 'Sistema'}</td>
                <td>${acaoDescricao}</td>
                <td style="font-weight: bold;">${item.quantidade || 0}</td>
            </tr>
        `;
    }).join('');
}

// Eventos
document.getElementById("btnLimpar").onclick = () => {
    const hoje = dataBrasiliaISO();
    document.getElementById("filtroDataInicio").value = hoje;
    document.getElementById("filtroDataFim").value = hoje;
    document.getElementById("inputBusca").value = "";
    filtrarHistorico();
};

document.getElementById("inputBusca").addEventListener("input", filtrarHistorico);
document.getElementById("filtroDataInicio").addEventListener("change", filtrarHistorico);
document.getElementById("filtroDataFim").addEventListener("change", filtrarHistorico);

const btnLogout = document.getElementById("btnLogout");
if(btnLogout) btnLogout.onclick = () => signOut(auth).then(() => window.location.href = "index.html");
