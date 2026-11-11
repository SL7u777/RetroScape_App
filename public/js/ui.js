export function h(tag, props, ...hijos) {
  const el = tag.includes(':') ? document.createElementNS('http://www.w3.org/2000/svg', tag.split(':')[1]) : document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, x); else el.style[p] = x; }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' && 'value' in el) el.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

export const svg = (tag, props, ...hijos) => h(`svg:${tag}`, props, ...hijos);

export function montar(destino, ...hijos) {
  destino.replaceChildren();
  agregar(destino, hijos);
}

// Re-renderiza un contenedor sin perder lo que la persona está escribiendo ni el foco
export function renderConservando(contenedor, construir) {
  const valores = {};
  contenedor.querySelectorAll('[data-k]').forEach(el => { if ('value' in el) valores[el.dataset.k] = el.value; });
  const activo = document.activeElement?.closest?.('[data-k]');
  const claveActiva = activo && contenedor.contains(activo) ? activo.dataset.k : null;
  const sel = claveActiva && 'selectionStart' in activo ? [activo.selectionStart, activo.selectionEnd] : null;
  const scroll = contenedor.scrollTop;
  montar(contenedor, construir());
  contenedor.querySelectorAll('[data-k]').forEach(el => {
    if (el.dataset.k in valores && el.dataset.fijo === undefined && 'value' in el) el.value = valores[el.dataset.k];
  });
  if (claveActiva) {
    const el = contenedor.querySelector(`[data-k="${CSS.escape(claveActiva)}"]`);
    if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(...sel); } catch { /* no aplica */ } }
  }
  contenedor.scrollTop = scroll;
}

export function anunciar(texto) {
  const r = document.getElementById('anuncios');
  r.textContent = '';
  setTimeout(() => { r.textContent = texto; }, 60);
}

export function aviso(texto, tipo = '') {
  const t = h('div', { class: `toast ${tipo}`, role: tipo === 'error' ? 'alert' : 'status' }, texto);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), tipo === 'error' ? 6000 : 3500);
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export const ZONAS = {
  cima: { nombre: 'Cima', con: 'la Cima', frase: 'Fue un buen sprint', icono: 'sol' },
  valle: { nombre: 'Valle', con: 'el Valle', frase: 'Tuvo altibajos', icono: 'hojas' },
  tormenta: { nombre: 'Tormenta', con: 'la Tormenta', frase: 'Fue difícil', icono: 'nube' },
};

export const RAZONES = { carga: 'Carga de trabajo', comunicacion: 'Comunicación', bloqueos: 'Bloqueos', logros: 'Logros', herramientas: 'Herramientas', otro: 'Otro' };

export const ORIGEN = { ia: 'Sugerida por IA', equipo: 'Propuesta del equipo', seguimiento: 'Seguimiento', congelada: 'Idea congelada', manual: 'Manual' };

export function resumenDistribucion(d) {
  if (!d) return '';
  return `${d.cima} en la cima, ${d.valle} en el valle y ${d.tormenta} en la tormenta.`;
}

// Markdown mínimo del acta: títulos, listas y negritas, sin HTML del usuario
export function markdownSimple(texto) {
  const cont = h('div', { class: 'acta' });
  let lista = null;
  const enLinea = linea => linea.split(/(\*\*[^*]+\*\*)/g).map(p => (p.startsWith('**') && p.endsWith('**') ? h('strong', null, p.slice(2, -2)) : p));
  for (const linea of String(texto || '').split('\n')) {
    if (/^\s*-\s+/.test(linea)) {
      if (!lista) cont.append(lista = h('ul'));
      lista.append(h('li', null, enLinea(linea.replace(/^\s*-\s+/, ''))));
      continue;
    }
    if (/^\s{2,}\S/.test(linea) && lista?.lastChild) { lista.lastChild.append(h('br'), ...enLinea(linea.trim())); continue; }
    lista = null;
    if (/^# /.test(linea)) cont.append(h('h1', null, linea.slice(2)));
    else if (/^## /.test(linea)) cont.append(h('h2', null, linea.slice(3)));
    else if (linea.trim()) cont.append(h('p', null, enLinea(linea)));
  }
  return cont;
}

// Dirección para que el equipo entre desde sus celulares: la IP de la red si se abrió en localhost
let direccion = null;
export async function direccionSala() {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return location.host;
  if (direccion) return direccion;
  try { direccion = (await (await fetch('/api/estado')).json()).red?.[0] || location.host; } catch { direccion = location.host; }
  return direccion;
}
