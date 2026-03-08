import { db, auth } from "./firebase-config.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

function setDatasPadrao() {
    const agora = new Date();
    const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const formatar = (d) => d.toISOString().split('T')[0];

    document.getElementById("dataInicio").value = formatar(primeiroDia);
    document.getElementById("dataFim").value = formatar(agora);
}

let todosPedidos = [];

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else {
        setDatasPadrao();
        processarDashboard();
    }
});

async function processarDashboard() {
    const dInicio = new Date(document.getElementById("dataInicio").value + "T00:00:00");
    const dFim = new Date(document.getElementById("dataFim").value + "T23:59:59");

    const q = query(
        collection(db, "pedidos"), 
        where("status", "==", "Concluído"),
        orderBy("data", "desc")
    );

    const snap = await getDocs(q);
    todosPedidos = [];
    const rankingLojas = {};
    const rankingLideres = {};
    let totalFin = 0;
    let totalPecas = 0;

    snap.forEach(doc => {
        const p = doc.data();
        const dataPed = p.data.toDate();

        if (dataPed >= dInicio && dataPed <= dFim) {
            todosPedidos.push({ id: doc.id, ...p });
            
            let subtotalPedido = 0;
            let pecasPedido = 0;
            p.itens.forEach(i => {
                const q = parseInt(i.qtdPedida || 0);
                subtotalPedido += (q * parseFloat(i.valor || 0));
                pecasPedido += q;
            });

            totalFin += subtotalPedido;
            totalPecas += pecasPedido;

            if (!rankingLojas[p.loja]) rankingLojas[p.loja] = { total: 0, qtd: 0, pedidos: [] };
            rankingLojas[p.loja].total += subtotalPedido;
            rankingLojas[p.loja].qtd += pecasPedido;
            rankingLojas[p.loja].pedidos.push({ id: doc.id, ...p, totalPedido: subtotalPedido });

            if (!rankingLideres[p.gerente]) rankingLideres[p.gerente] = { total: 0, qtd: 0, loja: p.loja, pedidos: [] };
            rankingLideres[p.gerente].total += subtotalPedido;
            rankingLideres[p.gerente].qtd += pecasPedido;
            rankingLideres[p.gerente].pedidos.push({ id: doc.id, ...p, totalPedido: subtotalPedido });
        }
    });

    document.getElementById("statPedidos").innerText = todosPedidos.length;
    document.getElementById("statPecas").innerText = totalPecas;
    document.getElementById("statFinanceiro").innerText = totalFin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    renderizarRank(rankingLojas, "rankLojas", "total");
    renderizarRank(rankingLideres, "rankLideres", "total");
}

function renderizarRank(obj, containerId, criterio) {
    const sortable = Object.entries(obj).sort((a, b) => b[1][criterio] - a[1][criterio]);
    const html = sortable.map(([name, data], index) => `
        <div class="rank-item" onclick="abrirDetalhes('${name}', '${containerId}')">
            <div class="rank-info">
                <span class="rank-number">#${index + 1}</span>
                <div>
                    <div class="name">${name}</div>
                    <div class="sub-info">${data.pedidos.length} pedidos | ${data.qtd} peças</div>
                </div>
            </div>
            <div class="rank-value">R$ ${data.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        </div>
    `).join('');
    document.getElementById(containerId).innerHTML = html || '<p style="padding:10px; color:#ccc">Sem dados no período.</p>';
    window[`dados_${containerId}`] = obj;
}

window.abrirDetalhes = (nome, containerId) => {
    const dados = window[`dados_${containerId}`][nome];
    document.getElementById("modalTitle").innerText = `Pedidos de: ${nome}`;
    
    const html = dados.pedidos.map(p => {
        const itensHtml = p.itens.map(i => `
            <tr>
                <td>${i.desc}<br><small>${i.fornecedor}</small></td>
                <td>${i.qtdPedida}</td>
                <td>R$ ${parseFloat(i.valor).toLocaleString('pt-BR')}</td>
                <td>R$ ${(i.qtdPedida * i.valor).toLocaleString('pt-BR')}</td>
            </tr>
        `).join('');

        return `
        <div class="pedido-mini-card">
            <div class="pedido-header" onclick="togglePedido('${p.id}')">
                <span>ID: ...${p.id.slice(-5).toUpperCase()}</span>
                <span>${p.data.toDate().toLocaleDateString()}</span>
                <span>R$ ${p.totalPedido.toLocaleString('pt-BR')}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="pedido-detalhes" id="det_${p.id}">
                <p style="margin:0 0 10px 0; font-size:0.8rem"><b>Aprovado por:</b> ${p.adminResponsavel || '---'}</p>
                ${p.numTransferencia ? `<p><b>Nº Transferência:</b> <span style="color:#004a99; font-weight:bold">${p.numTransferencia}</span></p>` : '<p style="color:orange"><i>Aguardando...</i></p>'}
                <table>
                    <thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Sub</th></tr></thead>
                    <tbody>${itensHtml}</tbody>
                </table>
            </div>
        </div>`;
    }).join('');
    
    document.getElementById("listaPedidosModal").innerHTML = html;
    document.getElementById("modalPedidos").style.display = "flex";
};

window.fecharModal = () => document.getElementById("modalPedidos").style.display = "none";

document.getElementById("modalPedidos").addEventListener("click", (event) => {
    if (event.target.id === "modalPedidos") {
        window.fecharModal();
    }
});

window.togglePedido = (id) => {
    const el = document.getElementById("det_"+id);
    el.style.display = el.style.display === "block" ? "none" : "block";
};

document.getElementById("btnFiltrar").onclick = processarDashboard;
document.getElementById("btnSair").onclick = () => signOut(auth).then(() => window.location.href = "index.html");
