import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.RETROSCAPE_DATOS = join(tmpdir(), `retroscape-test-${process.pid}.json`);
process.env.IA_PROVEEDOR = 'simulado';
const { cargar } = await import('../server/store.js');
const S = await import('../server/salas.js');
const { revisar } = await import('../server/ia/guardian.js');
cargar();

function nuevaSala(nombres = ['Ana', 'Luis', 'Carla']) {
  const { codigo } = S.crearSala({ equipo: 'Equipo Atlas', facilitador: 'María' });
  const sala = S.obtener(codigo);
  const miembros = nombres.map(n => sala.participantes[S.unirse(codigo, n).id]);
  return { sala, miembros };
}
const terminarCuenta = sala => { sala.revelacion.en = Date.now() - 1; };
const esperar = ms => new Promise(r => setTimeout(r, ms));

test('nadie ve la posición de otro antes de la revelación', () => {
  const { sala, miembros: [ana, luis] } = nuevaSala();
  S.colocar(sala, ana, { zona: 'cima', razones: [] });
  const vistaLuis = S.vista(sala, 'miembro', luis);
  const vistaFac = S.vista(sala, 'facilitador', null);
  assert.equal(vistaLuis.avatares.length, 0);
  assert.equal(vistaFac.avatares.length, 0);
  assert.equal(vistaFac.progreso.colocados, 1);
  assert.equal(S.vista(sala, 'miembro', ana).avatares[0].propio, true);
});

test('la revelación automática espera a que haya al menos 3 personas', () => {
  const { sala, miembros } = nuevaSala(['Ana', 'Luis']);
  miembros.forEach(m => S.colocar(sala, m, { zona: 'valle' }));
  assert.equal(sala.fase, 'colocacion');
  const tercero = sala.participantes[S.unirse(sala.codigo, 'Carla').id];
  S.colocar(sala, tercero, { zona: 'tormenta' });
  assert.equal(sala.fase, 'comentarios');
});

test('la revelación es anónima salvo para quien muestra su nombre', () => {
  const { sala, miembros: [ana, luis, carla] } = nuevaSala();
  [ana, luis, carla].forEach(m => S.colocar(sala, m, { zona: 'valle' }));
  terminarCuenta(sala);
  S.mostrarNombre(sala, luis, true);
  const nombres = S.vista(sala, 'miembro', ana).avatares.map(a => a.nombre).filter(Boolean);
  assert.deepEqual(nombres, ['Luis']);
});

test('los comentarios se guardan sin autor', () => {
  const { sala, miembros } = nuevaSala();
  miembros.forEach(m => S.colocar(sala, m, { zona: 'cima' }));
  S.comentar(sala, { texto: 'Faltó coordinar con producto las prioridades.' });
  const guardado = JSON.stringify(sala.comentarios[0]);
  for (const m of miembros) {
    assert.ok(!guardado.includes(m.id) && !guardado.includes(m.token) && !guardado.includes(m.nombre));
  }
});

test('el guardián revisa el nombre propio solo con reglas', async () => {
  const r = await revisar('Yo, Kevin, me quedé tres noches porque Luis subió código sin pruebas.', ['Luis'], 'Kevin');
  assert.ok(r.riesgos.some(x => x.tipo === 'identifica_autor'));
  assert.ok(r.riesgos.some(x => x.tipo === 'señala_persona' && x.fragmento === 'Luis'));
  assert.ok(r.sugerencia && !r.sugerencia.includes('Luis') && !r.sugerencia.includes('Kevin'));
});

test('el análisis solo agrupa comentarios que existen y propone acciones', async () => {
  const { sala, miembros } = nuevaSala();
  miembros.forEach(m => S.colocar(sala, m, { zona: 'tormenta' }));
  terminarCuenta(sala);
  S.comentar(sala, { texto: 'Otra vez nadie avisó antes de cambiar el entorno de pruebas.' });
  S.comentar(sala, { texto: 'La planificación duró casi dos horas.' });
  S.analizar(sala);
  while (sala.analisis.estado === 'procesando') await esperar(10);
  assert.equal(sala.analisis.estado, 'borrador');
  const ids = new Set(sala.comentarios.map(c => c.id));
  Object.keys(sala.analisis.asignacion).forEach(id => assert.ok(ids.has(id)));
  assert.ok(sala.analisis.acciones.length > 0);
  assert.ok(sala.analisis.seguimiento.length > 0, 'revisa las misiones del sprint anterior');
});

test('nadie puede usar más de 3 fichas y la votación se cierra sola', async () => {
  const { sala, miembros } = nuevaSala();
  miembros.forEach(m => S.colocar(sala, m, { zona: 'valle' }));
  terminarCuenta(sala);
  S.comentar(sala, { texto: 'Las reuniones de planificación se alargan.' });
  S.analizar(sala);
  while (sala.analisis.estado === 'procesando') await esperar(10);
  S.editarAnalisis(sala, 'accionAgregar', { texto: 'Definir criterios de terminado' });
  S.publicarAnalisis(sala);
  const [a1, a2] = sala.analisis.acciones;
  assert.throws(() => S.votar(sala, miembros[0], { votos: { [a1.id]: 4 }, confirmar: true }), /3 fichas/);
  miembros.forEach(m => S.votar(sala, m, { votos: { [a1.id]: 2, [a2.id]: 1 }, confirmar: true }));
  assert.equal(sala.fase, 'cierre');
  assert.equal(sala.misiones[0].texto, a1.texto);
  assert.equal(sala.misiones[0].fichas, 6);
});

test('Eco pide confirmación antes de revelar si falta gente', async () => {
  const { sala, miembros: [ana] } = nuevaSala();
  S.colocar(sala, ana, { zona: 'cima' });
  const r = await S.eco(sala, 'Eco, revela el paisaje', 'facilitador');
  assert.equal(sala.fase, 'colocacion');
  assert.match(r.voz, /Faltan 2 personas/);
  assert.equal(r.pendiente.accion, 'revelar');
  await S.eco(sala, 'sí, hazlo', 'facilitador');
  assert.equal(sala.fase, 'comentarios');
});

test('Eco no ejecuta acciones fuera de su fase', async () => {
  const { sala } = nuevaSala();
  const r = await S.eco(sala, 'cierra la votación', 'facilitador');
  assert.equal(sala.fase, 'colocacion');
  assert.match(r.voz, /Ahora no puedo/);
});

test('al vencer el tiempo de colocación se revela y se avisa', () => {
  const { sala, miembros: [ana] } = nuevaSala();
  S.colocar(sala, ana, { zona: 'cima' });
  S.temporizador(sala, 1);
  sala.temporizador.fin = Date.now() - 1;
  S.revisarTiempos();
  assert.equal(sala.fase, 'comentarios');
  assert.equal(sala.eco.ultimo.voz, 'Se acabó el tiempo.');
});

test('tras reiniciar el servidor nada queda colgado ni cuenta como conectado', async () => {
  const { sala, miembros: [ana] } = nuevaSala();
  ana.conexiones = 2;
  sala.analisis = { estado: 'procesando', paso: 'Agrupando' };
  S.temporizador(sala, 1);
  await esperar(400);
  cargar();
  const recargada = S.obtener(sala.codigo);
  assert.equal(Object.values(recargada.participantes)[0].conexiones, 0);
  assert.equal(recargada.analisis.estado, 'error');
});
