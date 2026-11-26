import { aplicarPreferencias } from './perfil.js';
import { vistaInicio } from './vistas/inicio.js';
import { vistaSala } from './vistas/sala.js';
import { vistaProyector } from './vistas/proyector.js';
import { vistaEquipo } from './vistas/equipo.js';
import { vistaPreferencias } from './vistas/preferencias.js';

aplicarPreferencias();
let limpiar = null;

const conMovimiento = () => !document.documentElement.classList.contains('sin-animacion') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
let primera = true;

// Cambio de pantalla con un fundido suave donde el navegador lo permite
function navegar() {
  if (primera || !document.startViewTransition || !conMovimiento()) { primera = false; rutear(); return; }
  document.startViewTransition(rutear);
}

function rutear() {
  limpiar?.();
  limpiar = null;
  const [ruta, qs] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(qs || '');
  const [seccion, id] = ruta.split('/').filter(Boolean);
  const app = document.getElementById('app');
  document.body.classList.toggle('modo-proyector', seccion === 'proyector');
  if (seccion === 'sala' && id) limpiar = vistaSala(app, decodeURIComponent(id).toUpperCase(), params.get('f'));
  else if (seccion === 'proyector' && id) limpiar = vistaProyector(app, decodeURIComponent(id).toUpperCase(), params.get('t'));
  else if (seccion === 'equipo' && id) limpiar = vistaEquipo(app, decodeURIComponent(id));
  else if (seccion === 'preferencias') limpiar = vistaPreferencias(app);
  else limpiar = vistaInicio(app, params);
  window.scrollTo(0, 0);
}

addEventListener('hashchange', navegar);
navegar();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
