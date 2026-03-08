<script type="module">
    import { auth, db } from "./js/firebase-config.js";
    import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
    import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

    // Lógica permanece idêntica à original
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registrado!', reg))
            .catch(err => console.log('Erro no SW', err));
    }

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                document.getElementById("navNome").innerText = data.nomeCompleto;
                document.getElementById("navUnidade").innerText = data.unidade || "Administração";
            }
        } else {
            window.location.href = "index.html";
        }
    });

    document.getElementById("btnLogout").onclick = (e) => {
        e.preventDefault();
        if(confirm("Deseja realmente sair?")) {
            signOut(auth).then(() => window.location.href = "index.html");
        }
    };
