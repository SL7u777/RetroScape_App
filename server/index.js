import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import zlib, { brotliCompressSync, gzipSync } from 'node:zlib';
import { extname, resolve, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { config, RAIZ } from './config.js';
import { cargar, datos } from './store.js';
import * as S from './salas.js';
import { suscribir, emitir, cerrarParticipante } from './eventos.js';
import { revisar as revisarGuardian } from './ia/guardian.js';
import { infoIA } from './ia/gateway.js';
import { transcribir, ErrorTranscripcion } from './ia/transcripcion.js';

cargar();
S.alCambiar(emitir);
setInterval(S.revisarTiempos, 1000).unref();

const PUBLICO = resolve(RAIZ, 'public');
const direccionesRed = () => Object.values(networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
const TIPOS = { '.woff2': 'font/woff2', '.webp': 'image/webp', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function enviar(res, status, cuerpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}

async function leerCuerpo(req, max) {
  let total = 0;
  const partes = [];
  for await (const p of req) {
    total += p.length;
    if (total > max) throw new S.ErrorSala('La solicitud es demasiado grande', 413);
    partes.push(p);
  }
  return Buffer.concat(partes);
}

async function leerJSON(req) {
  const cuerpo = await leerCuerpo(req, 64 * 1024);
  try { return cuerpo.length ? JSON.parse(cuerpo.toString('utf8')) : {}; } catch { throw new S.ErrorSala('Formato inválido'); }
}

const usoVoz = new Map();
function controlarVoz(clave) {
  const ahora = Date.now();
  const lista = (usoVoz.get(clave) || []).filter(t => ahora - t < 10 * 60000);
  if (lista.length >= 40) throw new S.ErrorSala('Usaste mucho el dictado en poco tiempo. Espera unos minutos o escribe.', 429);
  lista.push(ahora);
  usoVoz.set(clave, lista);
}

const intentos = new Map();
function controlarIntentos(ip, fallo) {
  const r = intentos.get(ip) || { fallos: 0, hasta: 0 };
  if (Date.now() < r.hasta) throw new S.ErrorSala('Demasiados intentos con códigos inválidos. Espera un minuto.', 429);
  if (fallo === true) {
    r.fallos++;
    if (r.fallos >= 5) { r.fallos = 0; r.hasta = Date.now() + 60000; }
    intentos.set(ip, r);
  } else if (fallo === false) intentos.delete(ip);
}

const SOLO_MIEMBRO = new Set(['colocar', 'mostrarNombre', 'comentar', 'votar']);
const EDICION = new Set(['temaRenombrar', 'temaCrear', 'temaDescartar', 'temasFusionar', 'comentarioAsignar', 'comentarioOcultar', 'accionEditar', 'accionDescartar', 'accionAgregar']);

async function accion(sala, rol, p, d) {
  if (SOLO_MIEMBRO.has(d.tipo)) {
    if (rol !== 'miembro') throw new S.ErrorSala('Esta acción es de los miembros del equipo', 403);
    if (d.tipo === 'colocar') return S.colocar(sala, p, d);
    if (d.tipo === 'mostrarNombre') return S.mostrarNombre(sala, p, d.valor);
    if (d.tipo === 'comentar') return S.comentar(sala, d);
    if (d.tipo === 'votar') return S.votar(sala, p, d);
  }
  if (d.tipo === 'proyectorVoz' && rol === 'proyector') return S.proyectorVoz(sala, d.activa);
  if (rol !== 'facilitador') throw new S.ErrorSala('Esta acción es del facilitador', 403);
  if (EDICION.has(d.tipo)) return S.editarAnalisis(sala, d.tipo, d);
  switch (d.tipo) {
    case 'revelar': return S.revelar(sala);
    case 'temporizador': return S.temporizador(sala, d.minutos);
    case 'analizar': return S.analizar(sala);
    case 'modoManual': return S.modoManual(sala);
    case 'publicarAnalisis': return S.publicarAnalisis(sala);
    case 'cerrarVotacion': return S.cerrarVotacion(sala);
    case 'responsable': return S.asignarResponsable(sala, d);
    case 'generarActa': return S.generarActa(sala);
    case 'editarActa': return S.editarActa(sala, d.texto);
    case 'cerrarRetro': return S.cerrarRetro(sala);
    case 'expulsar': { const r = S.expulsar(sala, d.id); cerrarParticipante(sala.codigo, d.id); return r; }
    case 'ecoConfirmar': return S.ecoBoton(sala, true, d.vozEn);
    case 'ecoCancelar': return S.ecoBoton(sala, false, d.vozEn);
    default: throw new S.ErrorSala('Acción desconocida');
  }
}

async function api(req, res, url) {
  const ruta = url.pathname.replace(/\/+$/, '');
  const ip = (process.env.CONFIAR_PROXY === '1' && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress;

  if (req.method === 'GET' && ruta === '/api/estado') return enviar(res, 200, { ia: infoIA(), red: direccionesRed().map(ip => `${ip}:${config.puerto}`) });

  if (req.method === 'GET' && ruta === '/api/equipos') {
    return enviar(res, 200, Object.values(datos().equipos).map(e => ({ id: e.id, nombre: e.nombre, ultimoSprint: e.historial.at(-1)?.sprint || 0 })));
  }
  let m = ruta.match(/^\/api\/equipos\/([a-z0-9-]+)$/);
  if (req.method === 'GET' && m) {
    const e = datos().equipos[m[1]];
    if (!e) throw new S.ErrorSala('No existe ese equipo', 404);
    return enviar(res, 200, e);
  }

  if (req.method === 'POST' && ruta === '/api/salas') return enviar(res, 201, S.crearSala(await leerJSON(req)));

  m = ruta.match(/^\/api\/salas\/([A-Za-z0-9-]+)\/(unirse|eventos|vista|accion|guardian|eco|transcribir|acta\.md)$/);
  if (!m) throw new S.ErrorSala('Ruta no encontrada', 404);
  const [, codigo, op] = m;

  if (op === 'unirse' && req.method === 'POST') {
    const d = await leerJSON(req);
    controlarIntentos(ip, null);
    let sala;
    try { sala = S.obtener(codigo); } catch (e) { controlarIntentos(ip, true); throw e; }
    controlarIntentos(ip, false);
    return enviar(res, 201, S.unirse(sala.codigo, d.nombre));
  }

  const sala = S.obtener(codigo);
  if (op === 'transcribir' && req.method === 'POST') {
    const { rol, participante } = S.autenticar(sala, url.searchParams.get('token'));
    if (rol === 'proyector') throw new S.ErrorSala('El proyector no dicta', 403);
    const tipo = String(req.headers['content-type'] || '').split(';')[0].trim();
    if (!tipo.startsWith('audio/')) throw new S.ErrorSala('Formato de audio no válido', 415);
    controlarVoz(participante?.id || 'facilitador-' + sala.codigo);
    const audio = await leerCuerpo(req, 4 * 1024 * 1024);
    if (audio.length < 800) return enviar(res, 200, { texto: '' });
    try {
      return enviar(res, 200, { texto: await transcribir(audio, tipo) });
    } catch (e) {
      if (e instanceof ErrorTranscripcion) throw new S.ErrorSala(e.message, 502);
      throw e;
    }
  }
  const d = req.method === 'POST' ? await leerJSON(req) : {};
  const { rol, participante } = S.autenticar(sala, d.token || url.searchParams.get('token'));

  if (op === 'eventos' && req.method === 'GET') return suscribir(sala, rol, participante, req, res);
  if (op === 'vista' && req.method === 'GET') return enviar(res, 200, S.vista(sala, rol, participante));
  if (op === 'acta.md' && req.method === 'GET') {
    if (!sala.acta.texto || (rol !== 'facilitador' && sala.acta.estado !== 'publicada')) throw new S.ErrorSala('El acta aún no está disponible', 404);
    res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="acta-sprint-${sala.sprint}.md"` });
    return res.end(sala.acta.texto);
  }
  if (req.method !== 'POST') throw new S.ErrorSala('Método no permitido', 405);

  if (op === 'accion') {
    await accion(sala, rol, participante, d);
    return enviar(res, 200, { ok: true });
  }
  if (op === 'guardian') {
    if (rol !== 'miembro') throw new S.ErrorSala('Solo los miembros publican comentarios', 403);
    const texto = String(d.texto || '').slice(0, 1000);
    if (texto.trim().length < 3) throw new S.ErrorSala('El comentario está vacío');
    const nombres = Object.values(sala.participantes).filter(p => p !== participante).map(p => p.nombre).concat(sala.facilitador.nombre);
    return enviar(res, 200, await revisarGuardian(texto, nombres, participante.nombre));
  }
  if (op === 'eco') {
    if (rol !== 'facilitador') throw new S.ErrorSala('Eco acompaña al facilitador', 403);
    return enviar(res, 200, await S.eco(sala, d.texto, d.vozEn));
  }
  throw new S.ErrorSala('Ruta no encontrada', 404);
}

// Archivos públicos comprimidos una vez y servidos con ETag: el navegador revalida y recibe 304 si no cambiaron
const cacheEstatico = new Map();
const COMPRIMIBLE = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg']);

async function cargarEstatico(archivo) {
  const info = await stat(archivo);
  if (!info.isFile()) throw new Error('No es un archivo');
  const previo = cacheEstatico.get(archivo);
  if (previo && previo.mtime === info.mtimeMs) return previo;
  const cuerpo = await readFile(archivo);
  const comprimible = COMPRIMIBLE.has(extname(archivo)) && cuerpo.length > 1024;
  const entrada = {
    mtime: info.mtimeMs,
    etag: `"${createHash('sha1').update(cuerpo).digest('base64url').slice(0, 20)}"`,
    cuerpo,
    br: comprimible ? brotliCompressSync(cuerpo, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }) : null,
    gzip: comprimible ? gzipSync(cuerpo, { level: 9 }) : null,
  };
  cacheEstatico.set(archivo, entrada);
  return entrada;
}

async function estatico(req, res, url) {
  let ruta;
  try { ruta = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = resolve(PUBLICO, '.' + ruta);
  if (!archivo.startsWith(PUBLICO + sep)) { res.writeHead(403); return res.end(); }
  let e;
  try { e = await cargarEstatico(archivo); } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('No encontrado');
  }
  const cabeceras = { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': /\.(woff2|png)$/.test(archivo) ? 'public, max-age=604800' : 'no-cache', ETag: e.etag, Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === e.etag) { res.writeHead(304, cabeceras); return res.end(); }
  const acepta = String(req.headers['accept-encoding'] || '');
  let cuerpo = e.cuerpo;
  if (e.br && /\bbr\b/.test(acepta)) { cuerpo = e.br; cabeceras['Content-Encoding'] = 'br'; }
  else if (e.gzip && /\bgzip\b/.test(acepta)) { cuerpo = e.gzip; cabeceras['Content-Encoding'] = 'gzip'; }
  cabeceras['Content-Length'] = cuerpo.length;
  res.writeHead(200, cabeceras);
  res.end(req.method === 'HEAD' ? undefined : cuerpo);
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else await estatico(req, res, url);
  } catch (e) {
    if (res.headersSent) return res.end();
    const status = e instanceof S.ErrorSala ? e.status : 500;
    if (status === 500) console.error(e);
    enviar(res, status, { error: status === 500 ? 'Error interno del servidor' : e.message });
  }
}).listen(config.puerto, () => {
  const ia = infoIA();
  const ips = direccionesRed();
  console.log(`\nRetroScape listo en http://localhost:${config.puerto}`);
  ips.forEach(ip => console.log(`En la misma red:   http://${ip}:${config.puerto}`));
  console.log(`IA: ${ia.nombre} (${ia.modelo})${ia.simulado ? `. ${ia.motivo}` : ''}\n`);
});
