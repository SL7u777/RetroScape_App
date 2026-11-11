const CLAVE = 'retroscape.perfil';
const SALAS = 'retroscape.salas';

const BASE = {
  nombre: '',
  prefs: { texto: 1, contraste: false, enfoque: false, sinAnimacion: false, vozEco: 'este' },
  dictado: { espera: 1800, correcciones: 0, sugerenciaVista: false },
  historial: {},
  emociones: [],
  ocultarSilueta: false,
};

function leer(clave, defecto) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? defecto; } catch { return defecto; }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch { return false; }
}

export function perfil() {
  const p = leer(CLAVE, null);
  if (!p) return { ...structuredClone(BASE), nuevo: true };
  return { ...structuredClone(BASE), ...p, prefs: { ...BASE.prefs, ...p.prefs }, dictado: { ...BASE.dictado, ...p.dictado } };
}

export function guardarPerfil(cambios) {
  const p = { ...perfil(), ...cambios };
  delete p.nuevo;
  escribir(CLAVE, p);
  aplicarPreferencias(p.prefs);
  return p;
}

export function aplicarPreferencias(prefs = perfil().prefs) {
  const r = document.documentElement;
  r.style.setProperty('--escala', prefs.texto || 1);
  r.classList.toggle('contraste', !!prefs.contraste);
  r.classList.toggle('sin-animacion', !!prefs.sinAnimacion || !!prefs.enfoque);
  r.classList.toggle('enfoque', !!prefs.enfoque);
}

export function recordarPosicion(equipoId, sprint, zona) {
  const p = perfil();
  p.historial[equipoId] = { ...(p.historial[equipoId] || {}), [sprint]: zona };
  guardarPerfil({ historial: p.historial });
}

export function posicionAnterior(equipoId, sprint) {
  const h = perfil().historial[equipoId] || {};
  const previos = Object.keys(h).map(Number).filter(s => s < sprint).sort((a, b) => b - a);
  return previos.length ? { sprint: previos[0], zona: h[previos[0]] } : null;
}

export function registrarEmocion(emocion, sprint) {
  const p = perfil();
  p.emociones = [...p.emociones, { emocion, sprint, fecha: Date.now() }].slice(-40);
  guardarPerfil({ emociones: p.emociones });
}

export const salasGuardadas = () => leer(SALAS, {});
export const credencial = codigo => salasGuardadas()[codigo] || null;
export function guardarCredencial(codigo, datos) {
  const s = salasGuardadas();
  s[codigo] = { ...datos, fecha: Date.now() };
  escribir(SALAS, s);
}
