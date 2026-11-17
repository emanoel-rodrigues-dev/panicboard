// Service worker do PanicBoard: abre sem rede e mostra as notificações de prazo.
// Só guarda arquivos do próprio site. Dados do Supabase e GIFs nunca passam pelo cache.
const CACHE = 'panicboard-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './favicon.svg', './manifest.webmanifest'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // página: rede primeiro (versão nova), cache se estiver sem rede
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put('./', c)); return r; }).catch(() => caches.match('./')));
    return;
  }
  if (url.pathname.includes('/assets/')) {
    // arquivos do build têm hash no nome: o que está no cache nunca fica velho
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put(req, c)); return r; })));
  }
});

// clicar na notificação abre (ou traz para a frente) o app na demanda
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const alvo = e.notification.data?.url || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    const w = ws.find((x) => new URL(x.url).origin === self.location.origin);
    if (w) { w.navigate(alvo); return w.focus(); }
    return self.clients.openWindow(alvo);
  }));
});
