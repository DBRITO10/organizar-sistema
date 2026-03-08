const CACHE_NAME = "assistencia-ms-600-v7"; // Mudei a versão para forçar atualização
const urlsToCache = [
  "./",
  "./admin_dashboard.html",
  "./admin_painel.html",
  "./admin_pedidos.html",
  "./admin_produtos.html",
  "./admin_vitrine.html",
  "./colaboradores.html",
  "./estoque.html",
  "./fornecedores.html",
  "./historico.html",
  "./index.html",
  "./usuarios.html",
  "./pagina.html",
  "./portal.html",
  "./first_login.html",
  "./produtos.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon.ico.png"
];

// Instalação
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Ativação e limpeza de cache antigo
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Busca de arquivos (Fetch)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
