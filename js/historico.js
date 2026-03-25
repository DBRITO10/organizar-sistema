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
        // Busca nome na coleção users
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const nomeExibicao = userDoc.exists() ? userDoc.data().nomeCompleto : user.email;
            const labelUser = document.getElementById("labelUser");
            if(labelUser) labelUser.innerHTML = `<i class="fas fa-user-circle"></i> ${nomeExibicao}`;
        } catch (err) {
            console.error("Erro user:", err);
        }
        
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
    const inputInicio = document.getElementById("filtroDataInicio");
    const inputFim = document.getElementById("filtroDataFim");
    const inputBusca = document.getElementById("inputBusca");

    const dataInicio = inputInicio ? inputInicio.value : "";
    const dataFim = inputFim ? inputFim.value : "";
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase() : "";

    const filtrados = historicoCompleto.filter(item => {
        if (!item.data) return false;
        const dataItem = item.data.toDate().toISOString().split('T')[0];
        const bateData = (!dataInicio || dataItem >= dataInicio) && (!dataFim || dataItem <= dataFim);
        
        // Texto para busca: junta tudo que pode ser relevante
        const textoDescricao = `${item.tipo} ${item.produto} ${item.sku} ${item.de} ${item.para} ${item.usuario}`.toLowerCase();
        const bateBusca = textoDescricao.includes(termoBusca);

        return bateData && bateBusca;
    });

    renderizarTabela(filtrados);
}

function renderizarTabela(dados) {
    const tbody = document.getElementById("tabelaHist");
    if(!tbody) return;
    
    tbody.innerHTML = dados.map(item => {
        // Monta a descrição do que aconteceu
        let evento = `<strong>${item.tipo || 'Movimentação'}</strong>: ${item.produto || 'Item'}`;
        if (item.de && item.para) evento += ` <small>(${item.de} ➔ ${item.para})</small>`;
        if (item.sku) evento += ` - <small>SKU: ${item.sku}</small>`;

        return `
            <tr>
                <td>${item.data ? item.data.toDate().toLocaleString('pt-BR') : '---'}</td>
                <td>${item.usuario || 'Sistema'}</td>
                <td>${evento}</td>
                <td style="font-weight: bold;">${item.quantidade || 0}</td>
            </tr>
        `;
    }).join('');
}

// Configuração dos Botões e Inputs
const btnLimpar = document.getElementById("btnLimpar");
if(btnLimpar) {
    btnLimpar.onclick = () => {
        const hoje = dataBrasiliaISO();
        if(document.getElementById("filtroDataInicio")) document.getElementById("filtroDataInicio").value = hoje;
        if(document.getElementById("filtroDataFim")) document.getElementById("filtroDataFim").value = hoje;
        if(document.getElementById("inputBusca")) document.getElementById("inputBusca").value = "";
        filtrarHistorico();
    };
}

// Listeners de busca em tempo real
if(document.getElementById("inputBusca")) document.getElementById("inputBusca").addEventListener("input", filtrarHistorico);
if(document.getElementById("filtroDataInicio")) document.getElementById("filtroDataInicio").addEventListener("change", filtrarHistorico);
if(document.getElementById("filtroDataFim")) document.getElementById("filtroDataFim").addEventListener("change", filtrarHistorico);

const btnLogout = document.getElementById("btnLogout");
if(btnLogout) btnLogout.onclick = () => signOut(auth).then(() => window.location.href = "index.html");
