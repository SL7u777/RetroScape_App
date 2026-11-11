import { randomUUID, randomInt } from 'node:crypto';
import { datos, guardar, obtenerOCrearEquipo } from './store.js';
import { analizar as iaAnalizar } from './ia/analisis.js';
import { revisarContinuidad } from './ia/continuidad.js';
import { redactarActa, actaEnTexto } from './ia/acta.js';
import { interpretar, ACCIONES } from './ia/eco.js';
import { infoIA } from './ia/gateway.js';

export const ZONAS = ['cima', 'valle', 'tormenta'];
export const RAZONES = ['carga', 'comunicacion', 'bloqueos', 'logros', 'herramientas', 'otro'];
export const FASES = { colocacion: 'Colocación', comentarios: 'Comentarios', analisis: 'Análisis', votacion: 'Votación', cierre: 'Misiones y acta', cerrada: 'Cerrada' };
const FICHAS = 3;
const MIN_ANONIMATO = 3;
const CUENTA_MS = 3500;
const ACTIVO_MS = 45000;

export class ErrorSala extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}

let notificar = () => {};
export const alCambiar = fn => { notificar = fn; };
function cambio(sala) {
  sala.actualizada = Date.now();
  guardar();
  notificar(sala);
}

const db = () => datos();
const limpiar = (v, max) => String(v ?? '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function obtener(codigo) {
  const sala = db().salas[String(codigo || '').toUpperCase()];
  if (!sala) throw new ErrorSala('No existe una sala con ese código', 404);
  return sala;
}

export const equipoDe = sala => db().equipos[sala.equipoId];

function nuevoCodigo() {
  let c;
  do { c = `RS-${randomInt(1000, 10000)}`; } while (db().salas[c]);
  return c;
}

export function crearSala({ equipo, sprint, facilitador }) {
  const nombre = limpiar(equipo, 40);
  if (!nombre) throw new ErrorSala('Escribe el nombre del equipo');
  const eq = obtenerOCrearEquipo(nombre);
  const ultimo = eq.historial.at(-1);
  const pedido = Number(sprint);
  const numero = Number.isInteger(pedido) && pedido > 0 ? pedido : (ultimo ? ultimo.sprint + 1 : 1);
  const codigo = nuevoCodigo();
  const sala = {
    codigo, equipoId: eq.id, sprint: numero, creada: Date.now(), actualizada: Date.now(), fase: 'colocacion',
    facilitador: { nombre: limpiar(facilitador, 30) || 'Facilitador', token: randomUUID() },
    proyectorToken: randomUUID(),
    participantes: {}, comentarios: [], sec: 0,
    temporizador: null, revelacion: null, foto: null,
    analisis: { estado: 'vacio' }, votacion: null, misiones: [], congeladas: [],
    acta: { estado: 'vacio' }, eco: { log: [], ultimo: null, pendiente: null, sec: 0 },
  };
  db().salas[codigo] = sala;
  cambio(sala);
  return { codigo, token: sala.facilitador.token };
}

export function unirse(codigo, nombre) {
  const sala = obtener(codigo);
  if (sala.fase === 'cerrada') throw new ErrorSala('Esta retrospectiva ya se cerró');
  let n = limpiar(nombre, 30);
  if (!n) throw new ErrorSala('Escribe tu nombre');
  const usados = new Set(Object.values(sala.participantes).map(p => p.nombre.toLowerCase()));
  for (let i = 2; usados.has(n.toLowerCase()); i++) n = `${limpiar(nombre, 27)} ${i}`;
  const p = { id: `p${Object.keys(sala.participantes).length + 1}`, token: randomUUID(), nombre: n, conexiones: 0, vistoEn: Date.now(), zona: null, razones: [], mostrarNombre: false, votos: {}, votoConfirmado: false };
  sala.participantes[p.id] = p;
  cambio(sala);
  return { token: p.token, id: p.id, nombre: n, codigo: sala.codigo };
}

export function autenticar(sala, token) {
  if (token && token === sala.facilitador.token) return { rol: 'facilitador', participante: null };
  if (token && token === sala.proyectorToken) return { rol: 'proyector', participante: null };
  const p = Object.values(sala.participantes).find(x => x.token === token);
  if (!p) throw new ErrorSala('No tienes acceso a esta sala', 401);
  p.vistoEn = Date.now();
  return { rol: 'miembro', participante: p };
}

const activo = p => p.conexiones > 0 || Date.now() - p.vistoEn < ACTIVO_MS;
const lista = sala => Object.values(sala.participantes);
const revelada = sala => !!sala.revelacion && Date.now() >= sala.revelacion.en;

function progreso(sala) {
  const todos = lista(sala);
  const colocados = todos.filter(p => p.zona).length;
  const pendientes = todos.filter(p => !p.zona && activo(p)).length;
  const votantes = todos.filter(p => activo(p) || p.votoConfirmado);
  const votaron = todos.filter(p => p.votoConfirmado).length;
  return { total: colocados + pendientes, colocados, pendientes, votaron, totalVotantes: votantes.length, faltanVotos: votantes.filter(p => !p.votoConfirmado).length };
}

function distribucion(sala) {
  const d = { cima: 0, valle: 0, tormenta: 0 };
  lista(sala).forEach(p => { if (p.zona) d[p.zona]++; });
  return d;
}

function razonesAgregadas(sala) {
  const r = {};
  lista(sala).forEach(p => p.razones.forEach(k => { r[k] = (r[k] || 0) + 1; }));
  return r;
}

export function colocar(sala, p, { zona, razones }) {
  if (sala.fase !== 'colocacion' || sala.revelacion) throw new ErrorSala('La colocación ya se cerró; tu posición se conserva');
  if (!ZONAS.includes(zona)) throw new ErrorSala('Elige cima, valle o tormenta');
  p.zona = zona;
  p.razones = [...new Set((Array.isArray(razones) ? razones : []).filter(r => RAZONES.includes(r)))].slice(0, 2);
  const pr = progreso(sala);
  if (pr.colocados >= MIN_ANONIMATO && pr.pendientes === 0) revelar(sala);
  else cambio(sala);
}

export function revelar(sala) {
  if (sala.fase !== 'colocacion' || sala.revelacion) throw new ErrorSala('El paisaje ya se reveló');
  if (!progreso(sala).colocados) throw new ErrorSala('Nadie se ha colocado todavía');
  sala.revelacion = { en: Date.now() + CUENTA_MS };
  sala.temporizador = null;
  sala.fase = 'comentarios';
  sala.foto = { distribucion: distribucion(sala), razones: razonesAgregadas(sala) };
  cambio(sala);
  setTimeout(() => cambio(sala), CUENTA_MS + 60);
}

export function mostrarNombre(sala, p, valor) {
  if (!revelada(sala)) throw new ErrorSala('Podrás mostrar tu nombre después de la revelación');
  p.mostrarNombre = !!valor;
  cambio(sala);
}

const MARCAS = ['identifica_autor', 'señala_persona', 'datos_sensibles'];

export function comentar(sala, { texto, marcado }) {
  if (!['colocacion', 'comentarios'].includes(sala.fase)) throw new ErrorSala('La fase de comentarios ya se cerró');
  const t = limpiar(texto, 1000);
  if (t.length < 3) throw new ErrorSala('El comentario está vacío');
  // El comentario no guarda autor, hora exacta ni orden de llegada
  sala.comentarios.push({ id: `c${++sala.sec}`, texto: t, marcado: MARCAS.includes(marcado) ? marcado : null, oculto: false, orden: randomInt(1e9) });
  cambio(sala);
}

export function temporizador(sala, minutos) {
  if (!['colocacion', 'comentarios', 'votacion'].includes(sala.fase)) throw new ErrorSala('En esta fase no hay temporizador');
  const m = Math.round(Number(minutos));
  sala.temporizador = m > 0 ? { fin: Date.now() + Math.min(30, m) * 60000, minutos: Math.min(30, m), fase: sala.fase } : null;
  cambio(sala);
}

export function revisarTiempos() {
  for (const sala of Object.values(db().salas)) {
    const t = sala.temporizador;
    if (!t || Date.now() < t.fin) continue;
    sala.temporizador = null;
    sala.eco.ultimo = { id: ++sala.eco.sec, voz: 'Se acabó el tiempo.', proyector: '', vozEn: sala.eco.vozEn || 'facilitador', fecha: Date.now() };
    try {
      if (t.fase === 'colocacion' && sala.fase === 'colocacion' && progreso(sala).colocados) { revelar(sala); continue; }
      if (t.fase === 'votacion' && sala.fase === 'votacion') { cerrarVotacion(sala); continue; }
    } catch { /* la fase cambió mientras tanto */ }
    cambio(sala);
  }
}

function historialPrevio(sala) {
  return equipoDe(sala).historial.filter(h => h.sprint < sala.sprint);
}

function temasHistoricos(sala) {
  const mapa = new Map();
  historialPrevio(sala).slice(-4).forEach(h => h.temas.forEach(t => {
    const k = t.canonico || t.nombre;
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(h.sprint);
  }));
  return [...mapa.entries()].map(([nombre, sprints]) => ({ nombre, sprints }));
}

export function analizar(sala) {
  const reintento = sala.fase === 'analisis' && sala.analisis.estado === 'error';
  if (!reintento && sala.fase !== 'comentarios') throw new ErrorSala('El análisis se pide al cerrar los comentarios');
  if (!revelada(sala)) throw new ErrorSala('Espera a que termine la revelación');
  sala.fase = 'analisis';
  sala.temporizador = null;
  const visibles = sala.comentarios.filter(c => !c.oculto);
  if (!visibles.length) {
    sala.analisis = { estado: 'borrador', proveedor: 'manual', temas: [], asignacion: {}, acciones: [], seguimiento: [], sec: 0, aviso: 'No hubo comentarios. Agrega las acciones que proponga el equipo.' };
    cambio(sala);
    return;
  }
  sala.analisis = { estado: 'procesando', paso: 'Agrupando los comentarios por tema' };
  cambio(sala);
  ejecutarAnalisis(sala, visibles);
}

async function ejecutarAnalisis(sala, visibles) {
  const eq = equipoDe(sala);
  const comentarios = visibles.map(c => ({ id: c.id, texto: c.texto }));
  try {
    const { datos: a, proveedor } = await iaAnalizar({ equipo: eq.nombre, sprint: sala.sprint, distribucion: sala.foto.distribucion, razones: sala.foto.razones, comentarios });
    const temas = a.temas.map((t, i) => ({ id: `t${i + 1}`, nombre: t.nombre, resumen: t.resumen, origen: 'ia', recurrente: null }));
    const asignacion = {};
    a.temas.forEach((t, i) => t.comentarios.forEach(cid => { asignacion[cid] = `t${i + 1}`; }));
    const acciones = a.acciones.map((x, i) => ({ id: `a${i + 1}`, texto: x.texto, porque: x.porque, temaId: temas.find(t => t.nombre === x.tema)?.id || null, origen: 'ia' }));
    sala.analisis = { estado: 'procesando', paso: 'Revisando las misiones del sprint anterior', proveedor, temas, asignacion, acciones, seguimiento: [], sec: acciones.length };
    cambio(sala);

    const previo = historialPrevio(sala).at(-1);
    const misiones = (previo?.misiones || []).map((m, i) => ({ id: `m${i + 1}`, texto: m.texto, criterio: m.criterio || '', sprint: previo.sprint }));
    const historicos = temasHistoricos(sala);
    try {
      const { datos: c } = await revisarContinuidad({ misiones, temas: temas.map(t => ({ id: t.id, nombre: t.nombre, resumen: t.resumen })), historicos, comentarios });
      sala.analisis.seguimiento = c.seguimiento.map(s => {
        const m = misiones.find(x => x.id === s.mision);
        return { ...s, texto: m.texto, sprint: m.sprint, enVotacion: false };
      });
      c.recurrencias.forEach(r => {
        const t = temas.find(x => x.id === r.tema);
        const h = historicos.find(x => x.nombre === r.temaPrevio);
        if (t && h) t.recurrente = { temaPrevio: h.nombre, sprints: h.sprints };
      });
    } catch (e) {
      sala.analisis.avisoContinuidad = `No se pudo revisar el seguimiento de las misiones: ${e.message}`;
    }
    sala.analisis.estado = 'borrador';
  } catch (e) {
    sala.analisis = { estado: 'error', error: e.message };
  }
  cambio(sala);
}

export function modoManual(sala) {
  if (sala.fase !== 'analisis' || !['error', 'borrador'].includes(sala.analisis.estado)) throw new ErrorSala('El modo manual se usa cuando el análisis no está disponible');
  sala.analisis = { estado: 'borrador', proveedor: 'manual', temas: [], asignacion: {}, acciones: [], seguimiento: [], sec: 0 };
  cambio(sala);
}

function borrador(sala) {
  if (sala.fase !== 'analisis' || sala.analisis.estado !== 'borrador') throw new ErrorSala('No hay un borrador del análisis para editar');
  return sala.analisis;
}

function tema(a, id) {
  const t = a.temas.find(x => x.id === id);
  if (!t) throw new ErrorSala('Ese tema ya no existe');
  return t;
}

export function editarAnalisis(sala, tipo, d) {
  const a = borrador(sala);
  switch (tipo) {
    case 'temaRenombrar': {
      const nombre = limpiar(d.nombre, 60);
      if (!nombre) throw new ErrorSala('El tema necesita un nombre');
      tema(a, d.temaId).nombre = nombre;
      break;
    }
    case 'temaCrear': {
      const nombre = limpiar(d.nombre, 60);
      if (!nombre) throw new ErrorSala('Escribe el nombre del tema');
      a.temas.push({ id: `t${Date.now().toString(36)}`, nombre, resumen: '', origen: 'manual', recurrente: null });
      break;
    }
    case 'temaDescartar': {
      tema(a, d.temaId);
      a.temas = a.temas.filter(t => t.id !== d.temaId);
      for (const [cid, tid] of Object.entries(a.asignacion)) if (tid === d.temaId) delete a.asignacion[cid];
      a.acciones.forEach(x => { if (x.temaId === d.temaId) x.temaId = null; });
      break;
    }
    case 'temasFusionar': {
      const origen = tema(a, d.origen);
      const destino = tema(a, d.destino);
      if (origen === destino) throw new ErrorSala('Elige otro tema para fusionar');
      for (const [cid, tid] of Object.entries(a.asignacion)) if (tid === origen.id) a.asignacion[cid] = destino.id;
      a.acciones.forEach(x => { if (x.temaId === origen.id) x.temaId = destino.id; });
      destino.recurrente = destino.recurrente || origen.recurrente;
      a.temas = a.temas.filter(t => t !== origen);
      break;
    }
    case 'comentarioAsignar': {
      if (!sala.comentarios.some(c => c.id === d.comentarioId)) throw new ErrorSala('Ese comentario no existe');
      if (d.temaId) { tema(a, d.temaId); a.asignacion[d.comentarioId] = d.temaId; } else delete a.asignacion[d.comentarioId];
      break;
    }
    case 'comentarioOcultar': {
      const c = sala.comentarios.find(x => x.id === d.comentarioId);
      if (!c) throw new ErrorSala('Ese comentario no existe');
      c.oculto = !!d.oculto;
      if (c.oculto) delete a.asignacion[c.id];
      break;
    }
    case 'accionEditar': {
      const x = a.acciones.find(y => y.id === d.accionId);
      const texto = limpiar(d.texto, 160);
      if (!x || !texto) throw new ErrorSala('La acción necesita un texto');
      x.texto = texto;
      break;
    }
    case 'accionDescartar':
      a.acciones = a.acciones.filter(x => x.id !== d.accionId);
      break;
    case 'accionAgregar': {
      const texto = limpiar(d.texto, 160);
      if (!texto) throw new ErrorSala('Escribe la acción');
      const origen = ['equipo', 'seguimiento', 'congelada'].includes(d.origen) ? d.origen : 'equipo';
      a.acciones.push({ id: `a${++a.sec}`, texto, porque: '', temaId: null, origen });
      if (origen === 'seguimiento') { const s = a.seguimiento.find(x => x.mision === d.mision); if (s) s.enVotacion = true; }
      break;
    }
    default:
      throw new ErrorSala('Acción desconocida');
  }
  cambio(sala);
}

export function publicarAnalisis(sala) {
  const a = borrador(sala);
  if (!a.acciones.length) throw new ErrorSala('Agrega al menos una acción para votar');
  const sinTema = sala.comentarios.filter(c => !c.oculto && !a.asignacion[c.id]);
  if (sinTema.length) {
    let otros = a.temas.find(t => t.nombre === 'Otros');
    if (!otros) a.temas.push(otros = { id: 'tOtros', nombre: 'Otros', resumen: 'Comentarios que no se agruparon en un tema.', origen: 'manual', recurrente: null });
    sinTema.forEach(c => { a.asignacion[c.id] = otros.id; });
  }
  a.temas = a.temas.filter(t => Object.values(a.asignacion).includes(t.id));
  a.estado = 'publicado';
  sala.fase = 'votacion';
  sala.votacion = { abierta: true, fichas: FICHAS, resultados: null, noVotaron: 0 };
  lista(sala).forEach(p => { p.votos = {}; p.votoConfirmado = false; });
  cambio(sala);
}

export function votar(sala, p, { votos, confirmar }) {
  if (sala.fase !== 'votacion') throw new ErrorSala('La votación está cerrada');
  if (p.votoConfirmado) throw new ErrorSala('Ya confirmaste tu voto');
  const ids = new Set(sala.analisis.acciones.map(a => a.id));
  const limpio = {};
  let suma = 0;
  for (const [id, n] of Object.entries(votos || {})) {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    if (ids.has(id) && v) { limpio[id] = v; suma += v; }
  }
  if (suma > FICHAS) throw new ErrorSala(`Tienes ${FICHAS} fichas; retira una para moverla`);
  p.votos = limpio;
  if (confirmar) {
    if (!suma) throw new ErrorSala('Asigna al menos una ficha antes de confirmar');
    p.votoConfirmado = true;
  }
  const pr = progreso(sala);
  if (confirmar && pr.votaron >= 1 && pr.faltanVotos === 0) cerrarVotacion(sala);
  else cambio(sala);
}

export function cerrarVotacion(sala) {
  if (sala.fase !== 'votacion') throw new ErrorSala('La votación no está abierta');
  const totales = Object.fromEntries(sala.analisis.acciones.map(a => [a.id, 0]));
  lista(sala).filter(p => p.votoConfirmado).forEach(p => Object.entries(p.votos).forEach(([id, n]) => { totales[id] += n; }));
  const orden = sala.analisis.acciones.map(a => ({ accionId: a.id, texto: a.texto, origen: a.origen, fichas: totales[a.id] })).sort((x, y) => y.fichas - x.fichas);
  const corte = orden[1]?.fichas ?? orden[0]?.fichas ?? 0;
  const adoptadas = orden.filter((x, i) => x.fichas > 0 && (i < 2 || (x.fichas === corte && i < 3)));
  sala.misiones = adoptadas.map((x, i) => ({ id: `mi${i + 1}`, texto: x.texto, fichas: x.fichas, origen: x.origen, responsable: '' }));
  sala.congeladas = orden.filter(x => !adoptadas.includes(x)).map(x => ({ texto: x.texto, fichas: x.fichas }));
  sala.votacion.abierta = false;
  sala.votacion.resultados = orden;
  sala.votacion.noVotaron = progreso(sala).faltanVotos;
  sala.temporizador = null;
  sala.fase = 'cierre';
  cambio(sala);
}

export function asignarResponsable(sala, { misionId, nombre }) {
  if (sala.fase !== 'cierre') throw new ErrorSala('Los responsables se asignan al cierre');
  const m = sala.misiones.find(x => x.id === misionId);
  if (!m) throw new ErrorSala('Esa misión no existe');
  m.responsable = limpiar(nombre, 40);
  cambio(sala);
}

function datosSprint(sala) {
  const a = sala.analisis;
  const cuenta = id => Object.values(a.asignacion || {}).filter(t => t === id).length;
  return {
    equipo: equipoDe(sala).nombre,
    sprint: sala.sprint,
    participantes: progreso(sala).colocados,
    distribucion: sala.foto?.distribucion || distribucion(sala),
    razones: progreso(sala).colocados >= MIN_ANONIMATO ? sala.foto?.razones || {} : {},
    temas: (a.temas || []).map(t => ({ nombre: t.nombre, resumen: t.resumen, comentarios: cuenta(t.id), canonico: t.recurrente?.temaPrevio || t.nombre })),
    misiones: sala.misiones.map(m => ({ texto: m.texto, fichas: m.fichas, responsable: m.responsable })),
    congeladas: sala.congeladas,
    seguimiento: (a.seguimiento || []).map(s => ({ texto: s.texto, estado: s.estado, explicacion: s.explicacion })),
  };
}

export function generarActa(sala) {
  if (sala.fase !== 'cierre') throw new ErrorSala('El acta se prepara después de la votación');
  sala.acta = { estado: 'procesando' };
  cambio(sala);
  (async () => {
    const s = datosSprint(sala);
    try {
      const { datos: r, proveedor } = await redactarActa(s);
      sala.acta = { estado: 'borrador', texto: actaEnTexto(s, r), criterios: r.criterios, proveedor };
    } catch (e) {
      sala.acta = { estado: 'error', error: e.message, texto: actaEnTexto(s, { resumen: '', clima: '', criterios: [], seguimiento: '', proximos: [] }) };
    }
    cambio(sala);
  })();
}

export function editarActa(sala, texto) {
  if (sala.fase !== 'cierre' || !['borrador', 'error'].includes(sala.acta.estado)) throw new ErrorSala('No hay un acta para editar');
  sala.acta.texto = String(texto || '').slice(0, 12000);
  cambio(sala);
}

export function cerrarRetro(sala) {
  if (sala.fase !== 'cierre') throw new ErrorSala('La retrospectiva se cierra después de la votación');
  if (sala.acta.estado === 'procesando') throw new ErrorSala('Espera a que termine el acta');
  const s = datosSprint(sala);
  const eq = equipoDe(sala);
  const criterios = sala.acta.criterios || [];
  const registro = {
    sprint: s.sprint, cerradoEn: Date.now(), participantes: s.participantes, distribucion: s.distribucion, razones: s.razones,
    temas: s.temas, misiones: sala.misiones.map((m, i) => ({ texto: m.texto, fichas: m.fichas, responsable: m.responsable, criterio: criterios[i] || '' })),
    congeladas: s.congeladas, seguimiento: s.seguimiento, acta: sala.acta.texto || '',
  };
  eq.historial = eq.historial.filter(h => h.sprint !== s.sprint).concat(registro).sort((x, y) => x.sprint - y.sprint);
  sala.acta.estado = sala.acta.texto ? 'publicada' : 'sin_acta';
  sala.fase = 'cerrada';
  cambio(sala);
}

function resumenEco(sala) {
  const pr = progreso(sala);
  const a = sala.analisis;
  const conAnalisis = ['borrador', 'publicado'].includes(a.estado);
  const cuenta = id => Object.values(a.asignacion || {}).filter(t => t === id).length;
  const p = { texto: '', detalle: '' };
  if (sala.fase === 'colocacion') { p.texto = `${pr.colocados} de ${pr.total} ya se colocaron.`; p.detalle = pr.pendientes ? `Faltan ${pr.pendientes}. Puedes darles un minuto o revelar igual.` : 'Ya están todos.'; }
  if (sala.fase === 'comentarios') { p.texto = `Hay ${plural(sala.comentarios.length, 'comentario', 'comentarios')} hasta ahora.`; p.detalle = 'Cuando el equipo termine, puedes cerrar los comentarios y pedir el análisis.'; }
  if (sala.fase === 'votacion') { p.texto = `${pr.votaron} de ${pr.totalVotantes} ya votaron.`; p.detalle = pr.faltanVotos ? `Faltan ${pr.faltanVotos} votos.` : 'Ya votaron todos.'; }
  return {
    fase: FASES[sala.fase],
    equipo: equipoDe(sala).nombre,
    sprint: sala.sprint,
    progreso: p,
    temporizador_segundos: sala.temporizador ? Math.max(0, Math.round((sala.temporizador.fin - Date.now()) / 1000)) : null,
    distribucion: revelada(sala) ? sala.foto.distribucion : 'aún oculta',
    comentarios: sala.comentarios.length,
    comentarios_marcados_por_guardian: sala.comentarios.filter(c => c.marcado && !c.oculto).length,
    analisis: a.estado,
    temas: conAnalisis ? a.temas.map(t => ({ nombre: t.nombre, comentarios: cuenta(t.id), recurrente: !!t.recurrente })) : [],
    acciones: conAnalisis ? a.acciones.map(x => x.texto) : [],
    misiones_anteriores: conAnalisis ? (a.seguimiento || []).map(s => ({ mision: s.texto, estado: s.estado })) : [],
    misiones_adoptadas: sala.misiones.map(m => `${m.texto} (${m.fichas} fichas)`),
    acta: sala.acta.estado,
  };
}

function motivoConfirmacion(sala, accion) {
  const pr = progreso(sala);
  if (accion === 'revelar') {
    if (pr.pendientes) return `Faltan ${plural(pr.pendientes, 'persona', 'personas')} por colocarse.`;
    if (pr.colocados < MIN_ANONIMATO) return `Solo hay ${plural(pr.colocados, 'persona colocada', 'personas colocadas')}; con tan pocas, las posiciones se podrían deducir.`;
  }
  if (accion === 'publicar_analisis' && sala.analisis.estado === 'borrador') {
    const marcados = sala.comentarios.filter(c => c.marcado && !c.oculto).length;
    if (marcados) return `Hay ${plural(marcados, 'comentario marcado', 'comentarios marcados')} por el guardián que se verá al publicar.`;
    return `Se mostrarán ${plural(sala.analisis.temas.length, 'tema', 'temas')} y ${plural(sala.analisis.acciones.length, 'acción', 'acciones')} a todo el equipo.`;
  }
  if (accion === 'cerrar_votacion' && pr.faltanVotos) return `Faltan ${plural(pr.faltanVotos, 'voto', 'votos')}.`;
  return null;
}

function ejecutar(sala, accion, args) {
  if (accion === 'revelar') revelar(sala);
  else if (accion === 'temporizador') temporizador(sala, args.minutos);
  else if (accion === 'analizar') analizar(sala);
  else if (accion === 'publicar_analisis') publicarAnalisis(sala);
  else if (accion === 'cerrar_votacion') cerrarVotacion(sala);
  else if (accion === 'generar_acta') generarActa(sala);
}

const HECHO = {
  revelar: 'Revelando el paisaje.',
  temporizador: a => `Temporizador de ${plural(a.minutos, 'minuto', 'minutos')}.`,
  analizar: 'Cierro los comentarios. El borrador del análisis llegará a tu pantalla.',
  publicar_analisis: 'Listo, la votación está abierta.',
  cerrar_votacion: 'Votación cerrada. Estas son las misiones.',
  generar_acta: 'Preparo el borrador del acta en tu pantalla.',
};
const hecho = (accion, args) => (typeof HECHO[accion] === 'function' ? HECHO[accion](args) : HECHO[accion]);

function responderEco(sala, salida) {
  sala.eco.pendiente = salida.pendiente ?? sala.eco.pendiente;
  if (salida.voz || salida.proyector) sala.eco.ultimo = { id: ++sala.eco.sec, voz: salida.voz, proyector: salida.proyector, vozEn: sala.eco.vozEn || 'facilitador', fecha: Date.now() };
  sala.eco.log.push({ quien: 'eco', texto: salida.voz || salida.celular || 'No tengo respuesta para eso.', celular: salida.voz ? salida.celular || '' : '' });
  sala.eco.log = sala.eco.log.slice(-20);
  cambio(sala);
  return { voz: salida.voz, proyector: salida.proyector, celular: salida.celular, pendiente: sala.eco.pendiente };
}

function resolverPendiente(sala, confirmar) {
  const pend = sala.eco.pendiente;
  if (!pend) return { voz: 'No hay nada pendiente por confirmar.', proyector: '', celular: '', pendiente: null };
  sala.eco.pendiente = null;
  if (!confirmar) return { voz: 'De acuerdo, no lo hago.', proyector: '', celular: '', pendiente: null };
  try {
    ejecutar(sala, pend.accion, pend.args);
    return { voz: hecho(pend.accion, pend.args), proyector: '', celular: '', pendiente: null };
  } catch (e) {
    return { voz: e.message, proyector: '', celular: '', pendiente: null };
  }
}

export function ecoBoton(sala, confirmar, vozEn) {
  if (vozEn) sala.eco.vozEn = vozEn === 'proyector' ? 'proyector' : 'facilitador';
  sala.eco.log.push({ quien: 'facilitador', texto: confirmar ? 'Confirmar' : 'Cancelar' });
  return responderEco(sala, resolverPendiente(sala, confirmar));
}

export async function eco(sala, texto, vozEn) {
  const dicho = limpiar(texto, 300);
  sala.eco.vozEn = vozEn === 'proyector' ? 'proyector' : 'facilitador';
  if (!dicho) throw new ErrorSala('No escuché nada');
  const historial = sala.eco.log.slice(-6);
  sala.eco.log.push({ quien: 'facilitador', texto: dicho });
  let r;
  try {
    ({ datos: r } = await interpretar({ texto: dicho, estado: resumenEco(sala), pendiente: sala.eco.pendiente, historial }));
  } catch (e) {
    return responderEco(sala, { voz: '', proyector: '', celular: `No pude entenderte: ${e.message} Mientras tanto, usa los botones de la pantalla.` });
  }
  if (r.accion === 'confirmar' || r.accion === 'cancelar') return responderEco(sala, resolverPendiente(sala, r.accion === 'confirmar'));
  if (!ACCIONES[r.accion]) return responderEco(sala, r);

  const def = ACCIONES[r.accion];
  if (!def.fases.includes(sala.fase)) return responderEco(sala, { voz: `Ahora no puedo ${def.que}: estamos en ${FASES[sala.fase].toLowerCase()}.`, proyector: '', celular: '' });
  // La IA interpreta el pedido; las reglas que protegen al equipo las aplica el sistema
  const motivo = motivoConfirmacion(sala, r.accion);
  if (motivo) {
    return responderEco(sala, { voz: `${motivo} ¿Lo hago igual?`, proyector: '', celular: `Pendiente: ${def.que}. Di "sí" o "no", o usa los botones.`, pendiente: { accion: r.accion, args: r.args, motivo } });
  }
  try {
    ejecutar(sala, r.accion, r.args);
    return responderEco(sala, { voz: r.voz || hecho(r.accion, r.args), proyector: r.proyector, celular: r.celular, pendiente: null });
  } catch (e) {
    return responderEco(sala, { voz: e.message, proyector: '', celular: '' });
  }
}

export function conexion(sala, participanteId, delta) {
  const p = sala.participantes[participanteId];
  if (!p) return;
  p.conexiones = Math.max(0, p.conexiones + delta);
  p.vistoEn = Date.now();
}

function bancoCongeladas(sala) {
  const vistos = new Set();
  return historialPrevio(sala).slice(-3).reverse().flatMap(h => h.congeladas.map(c => ({ ...c, sprint: h.sprint })))
    .filter(c => !vistos.has(c.texto) && vistos.add(c.texto)).slice(0, 6);
}

export function vista(sala, rol, p) {
  const pr = progreso(sala);
  const rev = revelada(sala);
  const eq = equipoDe(sala);
  const previo = historialPrevio(sala).at(-1);
  const a = sala.analisis;
  const esFac = rol === 'facilitador';
  const publicado = a.estado === 'publicado';
  const cuenta = id => Object.values(a.asignacion || {}).filter(t => t === id).length;
  const textoDe = id => sala.comentarios.find(c => c.id === id);
  const ordenados = [...sala.comentarios].sort((x, y) => x.orden - y.orden);

  const v = {
    rol,
    ia: infoIA(),
    sala: { codigo: sala.codigo, equipo: { id: eq.id, nombre: eq.nombre }, sprint: sala.sprint, fase: sala.fase, faseNombre: FASES[sala.fase], facilitador: sala.facilitador.nombre },
    progreso: { colocados: pr.colocados, total: pr.total, pendientes: pr.pendientes, votaron: pr.votaron, totalVotantes: pr.totalVotantes },
    temporizador: sala.temporizador ? { fin: sala.temporizador.fin, minutos: sala.temporizador.minutos } : null,
    revelacion: sala.revelacion,
    revelada: rev,
    previo: previo ? { sprint: previo.sprint, distribucion: previo.distribucion, misiones: previo.misiones.map(m => m.texto) } : null,
    comentarios: { total: sala.comentarios.length },
    avatares: [],
    distribucion: rev ? sala.foto.distribucion : null,
    razones: rev && pr.colocados >= MIN_ANONIMATO ? sala.foto.razones : null,
  };

  if (p) v.yo = { id: p.id, nombre: p.nombre, zona: p.zona, razones: p.razones, mostrarNombre: p.mostrarNombre, votos: p.votos, votoConfirmado: p.votoConfirmado };
  if (rev) {
    v.avatares = lista(sala).filter(x => x.zona).sort((x, y) => ZONAS.indexOf(x.zona) - ZONAS.indexOf(y.zona) || x.token.localeCompare(y.token))
      .map(x => ({ zona: x.zona, nombre: x.mostrarNombre ? x.nombre : null, propio: !!p && x.id === p.id }));
  } else if (p?.zona) {
    v.avatares = [{ zona: p.zona, nombre: null, propio: true }];
  }
  if (esFac) { v.integrantes = lista(sala).map(x => x.nombre); v.proyectorToken = sala.proyectorToken; }

  if (esFac && ['borrador', 'procesando', 'error'].includes(a.estado)) {
    v.analisis = {
      ...a,
      comentarios: ordenados.map(c => ({ id: c.id, texto: c.texto, marcado: c.marcado, oculto: c.oculto, tema: a.asignacion?.[c.id] || null })),
      temas: (a.temas || []).map(t => ({ ...t, cantidad: cuenta(t.id) })),
      seguimiento: (a.seguimiento || []).map(s => ({ ...s, evidencia: s.evidencia.map(id => textoDe(id)?.texto).filter(Boolean) })),
      banco: bancoCongeladas(sala),
    };
  } else if (publicado) {
    v.analisis = {
      estado: 'publicado', proveedor: a.proveedor,
      temas: a.temas.map(t => ({ id: t.id, nombre: t.nombre, resumen: t.resumen, origen: t.origen, recurrente: t.recurrente, cantidad: cuenta(t.id), comentarios: ordenados.filter(c => a.asignacion[c.id] === t.id).map(c => c.texto) })),
      seguimiento: (a.seguimiento || []).map(s => ({ texto: s.texto, estado: s.estado, explicacion: s.explicacion })),
    };
  } else {
    v.analisis = { estado: a.estado === 'vacio' ? 'vacio' : 'en_revision', paso: a.paso };
  }

  if (sala.votacion) {
    v.votacion = {
      abierta: sala.votacion.abierta, fichas: sala.votacion.fichas, noVotaron: sala.votacion.noVotaron,
      acciones: a.acciones.map(x => ({ id: x.id, texto: x.texto, origen: x.origen, tema: a.temas.find(t => t.id === x.temaId)?.nombre || null })),
      resultados: sala.votacion.abierta ? null : sala.votacion.resultados,
    };
  }
  v.misiones = sala.misiones;
  v.congeladas = sala.congeladas;
  v.acta = esFac || sala.acta.estado === 'publicada' ? { estado: sala.acta.estado, texto: sala.acta.texto, error: sala.acta.error } : { estado: sala.acta.estado };

  if (esFac) v.eco = { log: sala.eco.log, pendiente: sala.eco.pendiente, ultimo: sala.eco.ultimo };
  if (rol === 'proyector' || esFac) v.ecoUltimo = sala.eco.ultimo;
  return v;
}
