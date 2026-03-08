import { db, auth } from "./firebase-config.js";
import { updatePassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const btnSalvar = document.getElementById("btnSalvar");
const errorMsg = document.getElementById("errorMsg");

btnSalvar.addEventListener("click", async () => {
    const user = auth.currentUser;
    const nome = document.getElementById("nome").value;
    const senha = document.getElementById("senha").value;

    if (!nome || !senha || senha.length < 6) {
        errorMsg.textContent = "Preencha o nome e uma senha válida (mínimo 6 caracteres).";
        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = "SALVANDO...";

    try {
        // 1. Atualiza a senha no Auth
        await updatePassword(user, senha);

        // 2. Cria o documento na coleção 'users'
        await setDoc(doc(db, "users", user.uid), {
            nomeCompleto: nome,
            email: user.email,
            role: "leitor",        
            isFirstLogin: false,   
            dataCadastro: serverTimestamp() 
        });

        alert("Cadastro realizado! Bem-vindo, " + nome);
        window.location.href = "pagina.html";

    } catch (error) {
        console.error(error);
        if (error.code === 'auth/requires-recent-login') {
            alert("Sessão expirada. Faça login novamente para mudar a senha.");
            await signOut(auth);
            window.location.href = "index.html";
        } else {
            errorMsg.textContent = "Erro: " + error.message;
            btnSalvar.disabled = false;
            btnSalvar.textContent = "CONCLUIR CADASTRO";
        }
    }
});

onAuthStateChanged(auth, user => { if (!user) window.location.href = "index.html"; });
