import { db, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const errorMsg = document.getElementById("error");

async function realizarLogin() {
    const email = emailInput.value;
    const password = passInput.value;

    errorMsg.style.display = "none";
    errorMsg.innerText = "";

    if (!email || !password) {
        errorMsg.innerText = "❌ Preencha todos os campos.";
        errorMsg.style.display = "block";
        return;
    }

    btnLogin.innerText = "CARREGANDO...";
    btnLogin.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        const userDoc = await getDoc(doc(db, "users", uid));
        
        if (!userDoc.exists() || userDoc.data().isFirstLogin !== false) {
            window.location.href = "first_login.html";
        } else {
            window.location.href = "portal.html";
        }
    } catch (e) {
        btnLogin.innerText = "ENTRAR";
        btnLogin.disabled = false;
        errorMsg.innerText = "❌ Usuário ou senha incorretos.";
        errorMsg.style.display = "block";
    }
}

btnLogin.onclick = realizarLogin;
[emailInput, passInput].forEach(input => {
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') realizarLogin(); });
});
