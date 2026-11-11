// Une integrantes simulados a una sala para probar o demostrar el flujo.
// Uso: npm run equipo-simulado -- RS-1234 [cantidad] [url]

const [codigoArg, cantidadArg, urlArg] = process.argv.slice(2);
if (!codigoArg) {
  console.log('Uso: npm run equipo-simulado -- RS-1234 [cantidad] [url]');
  process.exit(1);
}
const URL_BASE = urlArg || `http://localhost:${process.env.PORT || 5173}`;
const CODIGO = codigoArg.toUpperCase();
const CANTIDAD = Math.min(8, Number(cantidadArg) || 5);

const NOMBRES = ['Ana', 'Luis', 'Carla', 'Jorge', 'Rosa', 'Mateo', 'Lucía', 'Iván'];
const ZONAS = ['valle', 'tormenta', 'cima', 'valle', 'tormenta', 'valle', 'cima', 'valle'];
const RAZONES = [['bloqueos', 'comunicacion'], ['bloqueos'], ['logros'], ['comunicacion'], ['carga', 'bloqueos'], ['herramientas'], ['logros'], []];
const COMENTARIOS = [
  'Otra vez nadie avisó antes de cambiar la configuración del entorno de pruebas y perdimos medio día.',
  'Desde que corremos las pruebas antes de desplegar, los despliegues ya no fallaron.',
  'Nos enteramos el mismo día de la demo de que backend cambió el contrato del API.',
  'La planificación volvió a pasar de una hora y media.',
  'Buen trabajo con la demo, el cliente quedó contento con el flujo de pagos.',
  'El entorno de pruebas se cayó dos veces y no sabíamos a quién preguntar.',
  'Faltó coordinar con producto las prioridades del sprint.',
];

const espera = ms => new Promise(r => setTimeout(r, ms));

async function llamar(ruta, cuerpo) {
  const res = await fetch(URL_BASE + ruta, cuerpo ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) } : undefined);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

async function integrante(i) {
  const { token, nombre } = await llamar(`/api/salas/${CODIGO}/unirse`, { nombre: NOMBRES[i] });
  const accion = (tipo, datos = {}) => llamar(`/api/salas/${CODIGO}/accion`, { token, tipo, ...datos });
  const vista = () => llamar(`/api/salas/${CODIGO}/vista?token=${token}`);
  console.log(`${nombre} entró a la sala`);

  await espera(1500 + i * 900);
  let v = await vista();
  if (v.sala.fase === 'colocacion' && !v.revelacion) {
    await accion('colocar', { zona: ZONAS[i], razones: RAZONES[i] });
    console.log(`${nombre} se colocó`);
  }
  await espera(800);
  for (let k = i; k < COMENTARIOS.length; k += CANTIDAD) {
    try { await accion('comentar', { texto: COMENTARIOS[k] }); } catch (e) { console.log(`${nombre}: ${e.message}`); }
    await espera(500);
  }

  let votado = false;
  for (;;) {
    await espera(2500);
    v = await vista();
    if (v.sala.fase === 'votacion' && !votado) {
      const acciones = v.votacion.acciones;
      const votos = {};
      for (let f = 0; f < 3; f++) {
        const a = acciones[(i + f * (i % 2 ? 1 : 2)) % Math.min(acciones.length, 3)];
        votos[a.id] = (votos[a.id] || 0) + 1;
      }
      await espera(1000 + i * 700);
      await accion('votar', { votos, confirmar: true });
      votado = true;
      console.log(`${nombre} votó`);
    }
    if (['cierre', 'cerrada'].includes(v.sala.fase)) break;
  }
  console.log(`${nombre} terminó`);
}

const resultados = await Promise.allSettled(Array.from({ length: CANTIDAD }, (_, i) => integrante(i)));
resultados.filter(r => r.status === 'rejected').forEach(r => console.error(r.reason.message));
