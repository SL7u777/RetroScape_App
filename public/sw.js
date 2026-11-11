const CACHE = 'retroscape-v1';
const BASE = ['./', './index.html', './manifest.webmanifest', './css/app.css', './marca/icono.svg', './marca/logo.png', './marca/logo-claro.png', './fuentes/inter-latin-wght-normal.woff2', './fuentes/bricolage-grotesque-latin-wght-normal.woff2', './icons/icon-192.png',
  './js/main.js', './js/ui.js', './js/api.js', './js/perfil.js', './js/voz.js', './js/paisaje.js', './js/iconos.js',
  './js/vistas/inicio.js', './js/vistas/sala.js', './js/vistas/miembro.js', './js/vistas/facilitador.js', './js/vistas/compositor.js', './js/vistas/emociones.js',
  './js/vistas/eco.js', './js/vistas/proyector.js', './js/vistas/equipo.js', './js/vistas/preferencias.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())));

// La interfaz carga desde la red y, sin conexión, desde la caché. La API nunca se cachea.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok && url.origin === location.origin) {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
    }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
