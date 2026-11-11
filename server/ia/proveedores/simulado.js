// Solo para pruebas: nunca reemplaza a un proveedor real que falla
const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VACIAS = new Set(['antes', 'desde', 'entre', 'sobre', 'cuando', 'porque', 'equipo', 'equipos', 'nuestro', 'nuestra', 'tambien', 'sprint', 'todos', 'hasta', 'ahora', 'mismo', 'otras', 'veces', 'durante', 'despues']);
const raices = t => new Set(norm(t).split(/[^a-z]+/).filter(p => p.length >= 5 && !VACIAS.has(p)).map(p => p.slice(0, 4)));
const comparten = (a, b) => [...raices(a)].filter(r => raices(b).has(r)).length;

export function guardian({ texto, nombres }) {
  const base = norm(texto);
  const riesgos = [];
  let sugerencia = texto;
  const yo = /^\s*yo,?\s+[a-záéíóúñ]+,\s*/i.exec(sugerencia);
  if (yo) {
    riesgos.push({ tipo: 'identifica_autor', fragmento: yo[0].trim().replace(/,$/, ''), explicacion: 'Empieza diciendo quién eres, así que el comentario dejaría de ser anónimo.' });
    sugerencia = sugerencia.replace(yo[0], '');
  }
  for (const n of nombres) {
    const primero = n.split(/\s+/)[0];
    if (primero.length >= 3 && new RegExp(`\\b${norm(primero)}\\b`).test(base)) {
      riesgos.push({ tipo: 'señala_persona', fragmento: primero, explicacion: `Asocia a ${primero} con el problema; la retro busca hablar del proceso.` });
      sugerencia = sugerencia.replace(new RegExp(`\\b${primero}\\s+`, 'i'), 'se ').replace(new RegExp(`\\b${primero}\\b`, 'gi'), 'alguien');
    }
  }
  const unico = /como (el|la) unic[oa] [a-z ]{2,20}/.exec(base);
  if (unico) riesgos.push({ tipo: 'identifica_autor', fragmento: texto.substr(unico.index, unico[0].length), explicacion: 'Un rol que solo tiene una persona permite saber quién lo escribió.' });
  sugerencia = sugerencia.trim();
  sugerencia = sugerencia.charAt(0).toUpperCase() + sugerencia.slice(1);
  const emociones = [
    ['enojo', /harto|indign|molest|rabia/], ['frustración', /otra vez|de nuevo|perdimos|fall[oó]|frustr|nadie avis|sin pruebas/],
    ['cansancio', /noches|horas extra|cansad|agotad/], ['preocupación', /preocup|riesgo|miedo|no llegamos/],
    ['confusión', /no entend|confus|no qued[oó] claro/], ['orgullo', /logramos|orgull|sacamos/], ['satisfacción', /bien|gracias|buen trabajo|funcion[oó]/],
  ];
  const emocion = (emociones.find(([, re]) => re.test(base)) || ['neutral'])[0];
  return { riesgos, sugerencia: riesgos.length ? sugerencia : '', emocion };
}

const CATALOGO = [
  { nombre: 'Entorno de pruebas inestable', claves: ['entorno de prueba', 'servidor de prueba', 'staging', 'desplieg', 'ambiente de prueba'], resumen: 'El entorno de pruebas cambia o falla sin aviso y frena el trabajo.', acciones: ['Avisar en el canal antes de modificar el entorno de pruebas', 'Agregar una verificación automática del entorno antes de cada despliegue'] },
  { nombre: 'Calidad antes de integrar', claves: ['prueba', 'test', 'merge', 'pull request', 'bug', 'revision de codigo'], resumen: 'Se integra código sin suficientes pruebas y los errores aparecen tarde.', acciones: ['Exigir pruebas en cada pull request antes del merge'] },
  { nombre: 'Comunicación entre equipos', claves: ['avis', 'comunic', 'enteramos', 'coordin', 'backend', 'producto', 'inform'], resumen: 'Los cambios y fechas no llegan a tiempo a todos los equipos.', acciones: ['Compartir los cambios de otros equipos en la daily'] },
  { nombre: 'Reuniones largas', claves: ['reunion', 'daily', 'planificacion'], resumen: 'Las reuniones se extienden más de lo útil.', acciones: ['Limitar la planificación a una hora con agenda previa'] },
  { nombre: 'Carga de trabajo', claves: ['horas extra', 'noches', 'carga', 'cansad', 'fin de semana'], resumen: 'Parte del equipo trabajó fuera de horario para cumplir.', acciones: ['Revisar la capacidad del equipo al planificar el sprint'] },
  { nombre: 'Logros del equipo', claves: ['logramos', 'orgull', 'buen trabajo', 'salio bien', 'entregamos'], resumen: 'El equipo reconoce lo que salió bien.', acciones: ['Mantener la práctica que funcionó y compartirla en la demo'] },
];

export function analisis({ comentarios }) {
  const grupos = new Map();
  for (const c of comentarios) {
    const base = norm(c.texto);
    const t = CATALOGO.find(x => x.claves.some(k => base.includes(k)));
    const nombre = t ? t.nombre : 'Otros temas';
    if (!grupos.has(nombre)) grupos.set(nombre, { t, ids: [] });
    grupos.get(nombre).ids.push(c.id);
  }
  const temas = [...grupos.entries()].sort((a, b) => b[1].ids.length - a[1].ids.length).slice(0, 5)
    .map(([nombre, g]) => ({ nombre, resumen: g.t ? g.t.resumen : 'Comentarios que no comparten un tema con los demás.', comentarios: g.ids }));
  const acciones = temas.flatMap(t => (CATALOGO.find(x => x.nombre === t.nombre)?.acciones || []).slice(0, t.comentarios.length > 1 ? 2 : 1)
    .map(texto => ({ texto, tema: t.nombre, porque: t.comentarios.length > 1 ? `${t.comentarios.length} comentarios hablan de esto.` : 'Un comentario habla de esto.' }))).slice(0, 6);
  return { temas, acciones };
}

export function continuidad({ misiones, temas, historicos, comentarios }) {
  const seguimiento = misiones.map(m => {
    const relacionados = comentarios.filter(c => comparten(m.texto, c.texto) >= 2);
    const positivos = relacionados.filter(c => /ya no|mejor|funciono|bien/.test(norm(c.texto)));
    const negativos = relacionados.filter(c => !positivos.includes(c));
    let estado = 'sin_evidencia';
    if (relacionados.length) estado = negativos.length > positivos.length ? 'persiste' : 'mejora';
    const evidencia = (estado === 'persiste' ? negativos : positivos).map(c => c.id);
    return {
      mision: m.id, estado, evidencia,
      explicacion: estado === 'persiste' ? `${evidencia.length} comentario${evidencia.length > 1 ? 's' : ''} describen el mismo problema.` : estado === 'mejora' ? 'Los comentarios indican que el problema mejoró.' : 'Ningún comentario menciona este problema.',
      ajuste: estado === 'persiste' ? `Asignar un responsable y un recordatorio semanal para: ${m.texto.charAt(0).toLowerCase()}${m.texto.slice(1)}` : '',
    };
  });
  const recurrencias = temas.flatMap(t => {
    const previo = historicos.find(h => comparten(h.nombre, t.nombre) >= 1);
    return previo ? [{ tema: t.id, tema_previo: previo.nombre }] : [];
  });
  return { seguimiento, recurrencias };
}

export function acta(s) {
  const d = s.distribucion;
  const tono = d.tormenta > d.cima ? 'un sprint difícil para varios' : d.cima >= d.valle ? 'un buen sprint para la mayoría' : 'un sprint regular';
  return {
    resumen: `En el sprint ${s.sprint}, ${s.participantes} personas participaron en la retrospectiva. Los temas principales fueron ${s.temas.map(t => t.nombre.toLowerCase()).join(', ')}. El equipo adoptó ${s.misiones.length} misiones para el próximo sprint.`,
    clima: `La distribución del paisaje muestra ${tono}.`,
    misiones: s.misiones.map(m => ({ texto: m.texto, como_sabremos: 'En la próxima retrospectiva nadie reporta este problema y el responsable confirma que se aplicó.' })),
    seguimiento: s.seguimiento.length ? (n => `${n} de ${s.seguimiento.length} misiones anteriores ${n === 1 ? 'sigue' : 'siguen'} sin resolver el problema.`)(s.seguimiento.filter(x => x.estado === 'persiste').length) : '',
    proximos_pasos: ['Revisar las misiones en la planificación del próximo sprint.'],
  };
}

export function eco({ texto, estado, pendiente }) {
  const t = norm(texto);
  const r = (accion, voz, proyector = '', celular = '', args = {}) => ({ accion, args, voz, proyector, celular });
  if (pendiente && /^(si|dale|hazlo|confirm|claro|ok)/.test(t)) return r('confirmar', 'Listo.');
  if (pendiente && /^(no|cancel|espera|mejor no)/.test(t)) return r('cancelar', 'De acuerdo, no lo hago.');
  if (/revel|muestra(les)? (el|como)|como quedo/.test(t)) return r('revelar', 'Revelando el paisaje.');
  const min = /(\d+|un|uno|dos|tres|cuatro|cinco|diez) minut/.exec(t);
  if (min) {
    const n = { un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, diez: 10 }[min[1]] || Number(min[1]);
    const sumar = /\b(mas|otros?|extra|adicional(es)?)\b/.test(t) && estado?.temporizador_segundos != null;
    return r('temporizador', `Temporizador de ${n} minutos.`, `Quedan ${n} minutos`, '', sumar ? { minutos: n, sumar: true } : { minutos: n });
  }
  if (/analiz|agrupa|cierra (los )?comentarios/.test(t)) return r('analizar', 'Cierro los comentarios y preparo el análisis.');
  if (/publica|abre la votacion|a votar/.test(t)) return r('publicar_analisis', 'Abro la votación.');
  if (/(cierra|termin)\w* (la )?votacion|ya votaron/.test(t)) return r('cerrar_votacion', 'Cierro la votación.');
  if (/acta|resumen final/.test(t)) return r('generar_acta', 'Preparo el borrador del acta en tu pantalla.');
  if (/falta|cuantos|como va/.test(t)) {
    const p = estado.progreso || {};
    return r('ninguna', p.texto || 'Aún no hay avance que contar.', '', p.detalle || '');
  }
  if (/tema|de que/.test(t)) {
    const temas = estado.temas || [];
    return temas.length
      ? r('ninguna', `Salen ${temas.length} temas. Los dejo en el proyector.`, temas.map(x => `${x.nombre} (${x.comentarios})`).join(' / '))
      : r('ninguna', 'Todavía no hay temas: primero hay que cerrar los comentarios.');
  }
  return r('ninguna', 'Puedo revelar el paisaje, poner un temporizador, cerrar los comentarios, abrir o cerrar la votación y preparar el acta.');
}
