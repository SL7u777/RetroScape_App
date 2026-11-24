import { vista, conexion, proyectorVoz } from './salas.js';

const clientes = new Map();

export function suscribir(sala, rol, participante, req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');
  const cliente = { res, rol, participante, ultimo: '' };
  if (!clientes.has(sala.codigo)) clientes.set(sala.codigo, new Set());
  clientes.get(sala.codigo).add(cliente);
  if (participante) conexion(sala, participante.id, +1);
  emitir(sala);
  req.on('close', () => {
    clientes.get(sala.codigo)?.delete(cliente);
    if (participante) { conexion(sala, participante.id, -1); emitir(sala); }
    else if (rol === 'proyector' && sala.eco.vozProyector && ![...(clientes.get(sala.codigo) || [])].some(c => c.rol === 'proyector')) proyectorVoz(sala, false);
  });
}

export function emitir(sala) {
  for (const c of clientes.get(sala.codigo) || []) {
    const datos = JSON.stringify(vista(sala, c.rol, c.participante));
    if (datos === c.ultimo) continue;
    c.ultimo = datos;
    c.res.write(`event: estado\ndata: ${datos}\n\n`);
  }
}

setInterval(() => {
  for (const grupo of clientes.values()) for (const c of grupo) c.res.write(': latido\n\n');
}, 20000).unref();

export function cerrarParticipante(codigo, id) {
  for (const c of [...(clientes.get(codigo) || [])]) if (c.participante?.id === id) { clientes.get(codigo).delete(c); c.res.end(); }
}
