import { db, auth } from "./firebase-config.js";
import { collection, onSnapshot, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

let dadosUsuario = null;
let listaOriginal = [];
let listaFiltradaAtual = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            dadosUsuario = userSnap.data();
            document.getElementById("navNome").innerText = dadosUsuario.nomeCompleto.split(' ')[0];
            document.getElementById("navUnidade").innerText = dadosUsuario.unidade;
            carregarProdutos();
        }
    } else { window.location.href = "index.html"; }
});

function carregarProdutos() {
    const q = query(collection(db, "produtos_transbordo"), where("qtd", ">", 0));
    onSnapshot(q, (snapshot) => {
        listaOriginal = [];
        const fornSet = new Set();
        snapshot.forEach(res => {
            const p = { id: res.id, ...res.data() };
            listaOriginal.push(p);
            fornSet.add(p.fornecedor);
        });

        const selectForn = document.getElementById("selectForn");
        const valorAtual = selectForn.value;
        selectForn.innerHTML = '<option value="">Todos Fornecedores</option>';
        Array.from(fornSet).sort().forEach(f => {
            selectForn.innerHTML += `<option value="${f}">${f}</option>`;
        });
        selectForn.value = valorAtual;
        filtrar();
    });
}

window.filtrar = () => {
    const txt = document.getElementById("inputBusca").value.toLowerCase();
    const forn = document.getElementById("selectForn").value;
    listaFiltradaAtual = listaOriginal.filter(p => 
        (p.desc.toLowerCase().includes(txt) || p.codigo.toLowerCase().includes(txt)) && 
        (forn === "" || p.fornecedor === forn)
    );
    atualizarResumos(listaFiltradaAtual);
    renderizar(listaFiltradaAtual);
};

function atualizarResumos(lista) {
    let volumes = 0;
    let financeiro = 0;
    lista.forEach(p => {
        const qtd = parseInt(p.qtd || 0);
        const val = parseFloat(p.valor || 0);
        volumes += qtd;
        financeiro += (qtd * val);
    });
    document.getElementById("totalVolumes").innerText = volumes.toLocaleString('pt-BR');
    document.getElementById("totalFinanceiro").innerText = financeiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderizar(lista) {
    const vitrine = document.getElementById("vitrine");
    if(lista.length === 0) { vitrine.innerHTML = "<p style='text-align:center; grid-column: 1/-1; color:#ddd;'>Nenhum item encontrado.</p>"; return; }

    vitrine.innerHTML = lista.map(p => {
        const unitario = parseFloat(p.valor || 0);
        const totalItem = unitario * parseInt(p.qtd || 0);
        return `
        <div class="card-produto">
            <div>
                <span class="badge-forn">${p.fornecedor}</span>
                <h3 style="margin:5px 0; font-size:1rem; color:var(--text-dark);">${p.desc}</h3>
                <small style="color:#666;">CÓDIGO: ${p.codigo}</small>
                <p style="font-size:0.85rem; margin-top:10px;">Estoque Disponível: <b>${p.qtd} un</b></p>
            </div>
            <div class="container-valores">
                <div class="info-valor">
                    <small style="font-size:0.6rem; display:block; text-transform:uppercase;">Valor Unitário</small>
                    R$ ${unitario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
                <div class="info-valor info-total">
                    <small style="font-size:0.6rem; display:block; text-transform:uppercase;">Soma Total</small>
                    R$ ${totalItem.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
            </div>
        </div>`;
    }).join('');
}

    window.exportarExcel = () => {
        if(listaFiltradaAtual.length === 0) return alert("Não há dados para exportar.");
        const dadosExcel = listaFiltradaAtual.map(p => ({
            "FORNECEDOR": p.fornecedor,
            "CÓDIGO": p.codigo,
            "DESCRIÇÃO": p.desc,
            "QTD": parseInt(p.qtd || 0),
            "VALOR UNIT.": parseFloat(p.valor || 0),
            "VALOR TOTAL": parseFloat(p.valor || 0) * parseInt(p.qtd || 0)
        }));
        const ws = XLSX.utils.json_to_sheet(dadosExcel);
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            const colUnit = XLSX.utils.encode_cell({r: R, c: 4});
            const colTotal = XLSX.utils.encode_cell({r: R, c: 5});
            if(ws[colUnit]) ws[colUnit].z = 'R$ #,##0.00';
            if(ws[colTotal]) ws[colTotal].z = 'R$ #,##0.00';
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Estoque");
        XLSX.writeFile(wb, `Estoque_600_${new Date().toLocaleDateString().replace(/\//g,'-')}.xlsx`);
    };

    window.exportarPDF = () => {
        if(listaFiltradaAtual.length === 0) return alert("Não há dados para exportar.");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        const dataHj = new Date().toLocaleString();
        doc.setTextColor(211, 47, 47); // Alterado para o vermelho Simonetti
        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.text("MS", 12, 18);
        doc.setTextColor(40);
        doc.setFontSize(16);
        doc.text("Estoque 600 - Transbordo", 35, 14);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Relatório gerado em: ${dataHj}`, 35, 20);
        const rows = [];
        let totalGeral = 0;
        listaFiltradaAtual.forEach(p => {
            const total = parseFloat(p.valor || 0) * parseInt(p.qtd || 0);
            totalGeral += total;
            rows.push([p.fornecedor, p.codigo, p.desc, p.qtd, `R$ ${parseFloat(p.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]);
        });
        doc.autoTable({
            startY: 28,
            head: [['FORNECEDOR', 'CÓDIGO', 'DESCRIÇÃO', 'QTD', 'V. UNITÁRIO', 'V. TOTAL']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [211, 47, 47], textColor: 255 },
            styles: { fontSize: 8 },
            foot: [[{content: 'VALOR TOTAL GERAL:', colSpan: 5, styles: {halign: 'right', fontStyle: 'bold'}}, {content: `R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, styles: {fontStyle: 'bold'}}]],
            footStyles: { fillColor: [211, 47, 47], textColor: 255 }
        });
        doc.save(`Estoque_Transbordo.pdf`);
    };

    document.getElementById("btnLogout").onclick = () => confirm("Sair do sistema?") && signOut(auth).then(() => window.location.href = "index.html");
