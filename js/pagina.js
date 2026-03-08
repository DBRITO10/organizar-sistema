import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

onAuthStateChanged(auth, async user => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) { window.location.href = "first_login.html"; return; }

            const userData = userDoc.data();
            const userRole = (userData.role || "leitor").toLowerCase();
            const nomeComp = userData.nomeCompleto || "Usuário";

            document.getElementById("userDisplay").innerText = nomeComp;

            if (userRole === "admin") {
                document.getElementById("btnGestao").style.display = "flex";
            }
        } catch (e) { console.error(e); }
    } else { window.location.href = "index.html"; }
});

document.getElementById("btnLogout").onclick = () => {
    auth.signOut().then(() => { window.location.href = "index.html"; });
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});
