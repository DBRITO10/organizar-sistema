import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                document.getElementById("displayName").innerText = userDoc.data().nomeCompleto;
            } else {
                document.getElementById("displayName").innerText = user.email;
            }
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
        if (outcome === 'accepted') {
            btnInstall.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

window.addEventListener('appinstalled', () => {
    btnInstall.style.display = 'none';
    deferredPrompt = null;
});
