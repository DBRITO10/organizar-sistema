import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            document.getElementById("displayName").innerText = userDoc.exists() ? userDoc.data().nomeCompleto : user.email;
        } catch (e) {
            document.getElementById("displayName").innerText = "Usuário";
        }
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById("btnSair").onclick = () => {
    signOut(auth).then(() => window.location.href = "index.html");
};

// Lógica de PWA (Instalação)
let deferredPrompt;
const btnInstall = document.getElementById('btnInstall');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.style.display = 'block';
});

btnInstall.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') btnInstall.style.display = 'none';
        deferredPrompt = null;
    }
});
