import { h, plural, ORIGEN, resumenDistribucion, markdownSimple, aviso, direccionSala } from '../ui.js';
import { icono } from '../iconos.js';
import { recordatorio, estandartes, temasPublicados, botonEscuchar } from './miembro.js';

// El panel se vuelve a dibujar con cada cambio: el campo a vaciar es el que está en pantalla ahora
const vaciar = k => { const el = document.querySelector(`[data-k="${k}"]`); if (el) el.value = ''; };

const ESTADO = {
  persiste: ['Sigue ocurriendo', 'error'],
  mejora: ['Mejoró', 'teal'],
  sin_evidencia: ['Sin evidencia', 'gris'],
};
const MARCA = { identifica_autor: 'puede identificar a su autor', señala_persona: 'señala a una persona', datos_sensibles: 'tiene un dato sensible' };

function temporizador(ctx) {
  const activo = !!ctx.v.temporizador;
  return h('div', { class: 'pila g8' },
    h('span', { class: 'chico', style: { fontWeight: 600 } }, activo ? 'Temporizador en marcha' : 'Dar tiempo al equipo'),
    h('div', { class: 'opciones' },
      [1, 2, 3, 5].map(m => h('button', { type: 'button', class: 'opcion', onclick: () => ctx.accion('temporizador', { minutos: m }) }, `${m} min`)),
      activo ? h('button', { type: 'button', class: 'opcion', onclick: () => ctx.accion('temporizador', { minutos: 0 }) }, 'Quitar') : null));
}

function invitar(ctx) {
  const { v, codigo } = ctx;
  const enlace = `${location.origin}${location.pathname}#/proyector/${codigo}?t=${v.proyectorToken}`;
  return h('div', { class: 'seccion' },
    h('h3', null, 'Invita al equipo'),
    h('p', { class: 'chico suave' }, 'Entran en ', h('span', { class: 'direccion' }, location.host), ` con el código ${codigo}.`),
    h('div', { class: 'fila' },
      h('a', { class: 'btn chico', href: enlace, target: '_blank', rel: 'noopener' }, icono('proyector'), 'Abrir vista para el proyector'),
      h('button', { type: 'button', class: 'btn chico', onclick: async () => {
        const propio = `${location.protocol}//${await direccionSala()}${location.pathname}#/sala/${codigo}?f=${ctx.token}`;
        try { await navigator.clipboard.writeText(propio); aviso('Enlace copiado. Ábrelo en tu celular para usar Eco desde ahí.'); } catch { window.prompt('Copia este enlace y ábrelo en tu celular:', propio); }
      } }, icono('copiar'), 'Facilitar desde mi celular')),
    h('p', { class: 'chico suave' }, 'Ese enlace da control de la sala: no lo compartas con el equipo.'),
    v.integrantes.length ? h('p', { class: 'chico' }, `En la sala: ${v.integrantes.join(', ')}.`) : h('p', { class: 'chico suave' }, 'Todavía no entra nadie.'));
}

function colocacion(ctx) {
  const { v, local } = ctx;
  const p = v.progreso;
  const revelar = () => {
    if ((p.pendientes || p.colocados < 3) && !local.confirmarRevelar) { local.confirmarRevelar = true; ctx.refrescar(); return; }
    local.confirmarRevelar = false;
    ctx.accion('revelar');
  };
  return [
    h('div', { class: 'pila g8' },
      h('h2', null, 'Colocación privada'),
      p.total ? h('div', { class: 'fila', style: { alignItems: 'baseline' } }, h('span', { class: 'gran-numero' }, `${p.colocados} de ${p.total}`), h('span', { class: 'suave' }, 'ya se colocaron')) : h('p', { class: 'nota' }, 'Esperando al equipo. Comparte el código de la sala para que entren.'),
      h('p', { class: 'suave chico' }, 'Tú tampoco ves dónde. El paisaje se revela solo cuando todos se colocan, cuando vence el tiempo o cuando lo decides.')),
    temporizador(ctx),
    local.confirmarRevelar ? h('div', { class: 'nota oro pila g8', role: 'alert' },
      h('p', null, p.pendientes ? `Faltan ${plural(p.pendientes, 'persona', 'personas')} por colocarse. Si revelas ahora, ya no podrán hacerlo.` : `Solo hay ${plural(p.colocados, 'persona colocada', 'personas colocadas')}. Con tan pocas, se podría deducir dónde está cada una.`),
      h('div', { class: 'fila' }, h('button', { type: 'button', class: 'btn chico primario', onclick: revelar }, 'Revelar igual'), h('button', { type: 'button', class: 'btn chico texto', onclick: () => { local.confirmarRevelar = false; ctx.refrescar(); } }, 'Esperar'))) : null,
    h('button', { type: 'button', class: 'btn primario', disabled: !p.colocados, onclick: revelar }, 'Revelar el paisaje'),
    invitar(ctx),
    recordatorio(v),
  ];
}

function comentarios(ctx) {
  const { v } = ctx;
  if (!v.revelada) return [h('h2', null, 'Revelando el paisaje…')];
  return [
    h('div', { class: 'pila g8' },
      h('h2', null, 'Comentarios anónimos'),
      h('p', null, resumenDistribucion(v.distribucion)),
      h('div', { class: 'fila', style: { alignItems: 'baseline' } }, h('span', { class: 'gran-numero' }, v.comentarios.total), h('span', { class: 'suave' }, v.comentarios.total === 1 ? 'comentario' : 'comentarios'))),
    temporizador(ctx),
    h('button', { type: 'button', class: 'btn primario', onclick: () => ctx.accion('analizar') }, icono('chispa'), 'Cerrar comentarios y analizar'),
    h('p', { class: 'chico suave' }, 'La IA agrupará los comentarios y revisará las misiones del sprint anterior. Verás un borrador que solo tú puedes editar antes de mostrarlo.'),
    invitar(ctx),
  ];
}

function comentarioEditable(ctx, c, temas) {
  return h('div', { class: `cita${c.marcado ? ' marcado' : ''}` },
    h('span', null, c.texto),
    c.marcado ? h('span', { class: 'chip error', style: { alignSelf: 'flex-start' } }, `El guardián avisó que ${MARCA[c.marcado]}`) : null,
    h('div', { class: 'fila' },
      h('label', { class: 'sr', for: `asig-${c.id}` }, 'Tema del comentario'),
      h('select', { class: 'input compacto', id: `asig-${c.id}`, style: { flex: '1 1 160px' }, onchange: e => ctx.accion('comentarioAsignar', { comentarioId: c.id, temaId: e.target.value || null }) },
        h('option', { value: '' }, 'Sin tema'), temas.map(t => h('option', { value: t.id, selected: t.id === c.tema }, t.nombre))),
      h('button', { type: 'button', class: 'btn texto chico', onclick: () => ctx.accion('comentarioOcultar', { comentarioId: c.id, oculto: true }) }, 'Ocultar')));
}

function pestanas(ctx, lista, actual) {
  const ir = k => { ctx.local.pestana = k; ctx.refrescar(); document.getElementById(`tab-${k}`)?.focus(); };
  return h('div', { class: 'pestanas', role: 'tablist', 'aria-label': 'Partes del análisis' }, lista.map(([k, texto, alerta], i) =>
    h('button', {
      type: 'button', role: 'tab', id: `tab-${k}`, 'aria-selected': String(k === actual), 'aria-controls': `pan-${k}`, tabindex: k === actual ? 0 : -1,
      onclick: () => ir(k),
      onkeydown: e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); ir(lista[(i + d + lista.length) % lista.length][0]); }
      },
    }, texto, alerta ? h('span', { class: 'alerta', 'aria-label': alerta, title: alerta }) : null)));
}

function editor(ctx) {
  const { v, local } = ctx;
  const a = v.analisis;
  const visibles = a.comentarios.filter(c => !c.oculto);
  const sinTema = visibles.filter(c => !c.tema);
  const ocultos = a.comentarios.filter(c => c.oculto);
  const marcados = visibles.filter(c => c.marcado).length;
  const persisten = (a.seguimiento || []).filter(s => s.estado === 'persiste' && !s.enVotacion).length;
  const textosAcciones = new Set(a.acciones.map(x => x.texto.toLowerCase()));
  const banco = (a.banco || []).filter(b => !textosAcciones.has(b.texto.toLowerCase()));
  const haySeguimiento = a.seguimiento?.length || a.avisoContinuidad;

  const lista = [
    ['temas', `Temas ${a.temas.length}`, marcados ? 'Hay comentarios marcados por el guardián' : ''],
    haySeguimiento ? ['misiones', 'Seguimiento', persisten ? `${plural(persisten, 'misión sigue', 'misiones siguen')} ocurriendo` : ''] : null,
    ['acciones', `Acciones ${a.acciones.length}`, ''],
  ].filter(Boolean);
  const actual = lista.some(([k]) => k === local.pestana) ? local.pestana : 'temas';

  const crearTema = h('input', { class: 'input', 'data-k': 'nuevo-tema', placeholder: 'Nombre del tema nuevo', maxlength: 60, 'aria-label': 'Nombre del nuevo tema' });
  const nuevaAccion = h('input', { class: 'input', 'data-k': 'nueva-accion', placeholder: 'Acción que propone el equipo', maxlength: 160, 'aria-label': 'Nueva acción del equipo' });
  const agregarAccion = async () => {
    if (!nuevaAccion.value.trim()) { nuevaAccion.focus(); return; }
    if (await ctx.accion('accionAgregar', { texto: nuevaAccion.value, origen: 'equipo' })) vaciar('nueva-accion');
  };

  const temas = () => [
    marcados ? h('p', { class: 'nota oro' }, marcados === 1 ? 'Un comentario se publicó a pesar del aviso del guardián. Revísalo y ocúltalo si expone a alguien.' : `${marcados} comentarios se publicaron a pesar del aviso del guardián. Revísalos y ocúltalos si exponen a alguien.`) : null,
    a.temas.length ? h('ul', { class: 'items' }, a.temas.map(t => h('li', { class: 'item' },
      h('div', { class: 'cabeza' },
        h('input', { class: 'nombre-tema', 'data-k': `tema-${t.id}`, value: t.nombre, maxlength: 60, 'aria-label': 'Nombre del tema', onchange: e => ctx.accion('temaRenombrar', { temaId: t.id, nombre: e.target.value }) }),
        h('span', { class: 'chip gris' }, plural(t.cantidad, 'comentario', 'comentarios'))),
      h('div', { class: 'etiquetas' },
        t.origen === 'ia' ? h('span', { class: 'chip ia' }, icono('chispa'), 'Sugerido por IA') : h('span', { class: 'chip teal' }, 'Creado a mano'),
        t.recurrente ? h('span', { class: 'chip oro', title: `Mismo problema que "${t.recurrente.temaPrevio}"` }, icono('repetir'), `Vuelve: sprints ${t.recurrente.sprints.join(', ')}`) : null,
        visibles.some(c => c.tema === t.id && c.marcado) ? h('span', { class: 'chip error' }, 'Incluye un comentario marcado') : null),
      t.resumen ? h('p', { class: 'chico suave' }, t.resumen) : null,
      h('details', null, h('summary', null, `Ver y mover ${t.cantidad === 1 ? 'el comentario' : 'los comentarios'}`),
        h('div', { class: 'pila g8', style: { marginTop: '8px' } }, visibles.filter(c => c.tema === t.id).map(c => comentarioEditable(ctx, c, a.temas)))),
      h('div', { class: 'fila' },
        a.temas.length > 1 ? h('select', { class: 'input compacto', style: { flex: '1 1 150px' }, 'aria-label': `Fusionar ${t.nombre} con otro tema`, onchange: e => e.target.value && ctx.accion('temasFusionar', { origen: t.id, destino: e.target.value }) },
          h('option', { value: '' }, 'Fusionar con…'), a.temas.filter(x => x.id !== t.id).map(x => h('option', { value: x.id }, x.nombre))) : null,
        h('button', { type: 'button', class: 'btn texto chico peligro', onclick: () => ctx.accion('temaDescartar', { temaId: t.id }) }, icono('basura'), 'Descartar'))))) : h('p', { class: 'suave chico' }, 'Aún no hay temas. Crea uno y asígnale comentarios.'),
    h('div', { class: 'fila' }, crearTema, h('button', { type: 'button', class: 'btn chico', onclick: async () => { if (crearTema.value.trim() && await ctx.accion('temaCrear', { nombre: crearTema.value })) vaciar('nuevo-tema'); } }, icono('mas'), 'Crear tema')),
    sinTema.length ? h('div', { class: 'pila g8' }, h('strong', { class: 'chico' }, `Sin tema (${sinTema.length})`), sinTema.map(c => comentarioEditable(ctx, c, a.temas)), h('p', { class: 'chico suave' }, 'Si no les asignas un tema, al publicar irán a "Otros".')) : null,
    ocultos.length ? h('details', null, h('summary', null, `Ocultos del análisis (${ocultos.length})`), h('div', { class: 'pila g8', style: { marginTop: '8px' } },
      ocultos.map(c => h('div', { class: 'cita' }, c.texto, h('button', { type: 'button', class: 'btn texto chico', style: { alignSelf: 'flex-start' }, onclick: () => ctx.accion('comentarioOcultar', { comentarioId: c.id, oculto: false }) }, 'Volver a incluir'))))) : null,
  ];

  const misiones = () => [
    h('p', { class: 'chico suave' }, 'La IA comparó lo que dijo el equipo hoy con lo que se acordó en el sprint anterior. Revisa en qué se basa antes de llevar algo a la votación.'),
    a.avisoContinuidad ? h('p', { class: 'nota error' }, a.avisoContinuidad) : null,
    h('ul', { class: 'items' }, a.seguimiento.map(s => h('li', { class: `item${s.estado === 'persiste' ? ' persiste' : ''}` },
      h('div', { class: 'cabeza' }, h('strong', null, s.texto), h('span', { class: `chip ${ESTADO[s.estado][1]}` }, ESTADO[s.estado][0])),
      s.explicacion ? h('p', { class: 'chico' }, s.explicacion) : null,
      s.evidencia.length ? h('details', null, h('summary', null, `En qué se basa (${s.evidencia.length})`), h('div', { class: 'pila g8', style: { marginTop: '8px' } }, s.evidencia.map(t => h('div', { class: 'cita' }, t)))) : null,
      s.ajuste ? h('div', { class: 'sugerencia' },
        h('span', { class: 'chico' }, 'Propuesta ajustada para este sprint:'),
        h('p', null, s.ajuste),
        h('button', { type: 'button', class: 'btn chico', style: { alignSelf: 'flex-start' }, disabled: s.enVotacion, onclick: () => ctx.accion('accionAgregar', { texto: s.ajuste, origen: 'seguimiento', mision: s.mision }) }, s.enVotacion ? icono('check') : icono('mas'), s.enVotacion ? 'En la votación' : 'Llevar a la votación')) : null))),
  ];

  const acciones = () => [
    a.acciones.length ? h('ul', { class: 'items' }, a.acciones.map(x => h('li', { class: 'item' },
      h('div', { class: 'cabeza' },
        h('textarea', { class: 'nombre-tema', rows: 1, 'data-k': `accion-${x.id}`, value: x.texto, maxlength: 160, 'aria-label': 'Texto de la acción', onchange: e => ctx.accion('accionEditar', { accionId: x.id, texto: e.target.value }) }),
        h('button', { type: 'button', class: 'btn texto chico peligro', 'aria-label': `Descartar ${x.texto}`, onclick: () => ctx.accion('accionDescartar', { accionId: x.id }) }, icono('basura'))),
      h('div', { class: 'etiquetas' },
        h('span', { class: `chip${x.origen === 'ia' ? ' ia' : x.origen === 'seguimiento' ? ' oro' : ' teal'}` }, ORIGEN[x.origen]),
        x.temaId ? h('span', { class: 'chip gris' }, a.temas.find(t => t.id === x.temaId)?.nombre || '') : null),
      x.porque ? h('p', { class: 'chico suave' }, x.porque) : null))) : h('p', { class: 'suave chico' }, 'Agrega al menos una acción para votar.'),
    h('div', { class: 'fila' }, nuevaAccion, h('button', { type: 'button', class: 'btn chico', onclick: agregarAccion }, icono('mas'), 'Agregar')),
    banco.length ? h('details', null, h('summary', null, `Ideas congeladas de sprints anteriores (${banco.length})`),
      h('ul', { class: 'items', style: { marginTop: '8px' } }, banco.map(b => h('li', { class: 'fila entre cita' },
        h('span', null, b.texto, h('span', { class: 'chico suave' }, ` (sprint ${b.sprint})`)),
        h('button', { type: 'button', class: 'btn chico', onclick: () => ctx.accion('accionAgregar', { texto: b.texto, origen: 'congelada' }) }, 'Agregar'))))) : null,
  ];

  const contenido = { temas, misiones, acciones }[actual]();
  return [
    h('div', { class: 'pila g8' },
      h('h2', null, 'Revisa el análisis'),
      h('p', { class: 'suave chico' }, a.proveedor === 'manual' ? 'Agrupa los comentarios a mano y escribe las acciones.' : 'Borrador preparado por la IA. El equipo no lo verá hasta que lo publiques.'),
      a.aviso ? h('p', { class: 'nota' }, a.aviso) : null),
    pestanas(ctx, lista, actual),
    h('div', { class: 'pila', role: 'tabpanel', id: `pan-${actual}`, 'aria-labelledby': `tab-${actual}`, tabindex: 0 }, contenido),
    h('div', { class: 'barra-publicar' },
      h('span', { class: 'chico' }, `${plural(a.temas.length, 'tema', 'temas')} y ${plural(a.acciones.length, 'acción', 'acciones')} para votar`),
      h('button', { type: 'button', class: 'btn primario', disabled: !a.acciones.length, onclick: () => ctx.accion('publicarAnalisis') }, 'Publicar y abrir la votación')),
  ];
}

function analisis(ctx) {
  const a = ctx.v.analisis;
  if (a.estado === 'procesando') {
    const pasos = ['Agrupando los comentarios por tema', 'Revisando las misiones del sprint anterior'];
    const actual = pasos.indexOf(a.paso);
    return [
      h('h2', null, 'Analizando con IA'),
      h('ul', { class: 'items', 'aria-live': 'polite' }, pasos.map((p, i) => h('li', { class: 'fila' }, h('span', { class: `chip ${i < actual ? 'teal' : i === actual ? '' : 'gris'}` }, i < actual ? 'Listo' : i === actual ? 'En curso' : 'Después'), p))),
      h('p', { class: 'suave chico' }, `${ctx.v.ia.nombre} recibe solo el texto de los comentarios, sin autor.`),
    ];
  }
  if (a.estado === 'error') {
    return [
      h('h2', null, 'El análisis no respondió'),
      h('p', { class: 'nota error' }, a.error),
      h('p', { class: 'suave chico' }, 'No se muestran resultados simulados como si fueran reales. Puedes reintentar o agrupar los comentarios a mano.'),
      h('div', { class: 'fila' }, h('button', { type: 'button', class: 'btn primario', onclick: () => ctx.accion('analizar') }, icono('repetir'), 'Reintentar'), h('button', { type: 'button', class: 'btn', onclick: () => ctx.accion('modoManual') }, 'Agrupar a mano')),
    ];
  }
  return editor(ctx);
}

function votacion(ctx) {
  const { v, local } = ctx;
  const p = v.progreso;
  const cerrar = () => {
    if (p.totalVotantes - p.votaron > 0 && !local.confirmarCierre) { local.confirmarCierre = true; ctx.refrescar(); return; }
    local.confirmarCierre = false;
    ctx.accion('cerrarVotacion');
  };
  return [
    h('div', { class: 'pila g8' },
      h('h2', null, 'Votación en curso'),
      h('div', { class: 'fila', style: { alignItems: 'baseline' } }, h('span', { class: 'gran-numero' }, `${p.votaron} de ${p.totalVotantes}`), h('span', { class: 'suave' }, 'ya votaron')),
      h('p', { class: 'suave chico' }, 'Nadie ve los totales, tampoco tú. Se cierra sola cuando todos confirman o vence el tiempo.')),
    temporizador(ctx),
    local.confirmarCierre ? h('div', { class: 'nota oro pila g8', role: 'alert' }, h('p', null, `Faltan ${plural(p.totalVotantes - p.votaron, 'voto', 'votos')}.`),
      h('div', { class: 'fila' }, h('button', { type: 'button', class: 'btn chico primario', onclick: cerrar }, 'Cerrar igual'), h('button', { type: 'button', class: 'btn chico texto', onclick: () => { local.confirmarCierre = false; ctx.refrescar(); } }, 'Esperar'))) : null,
    h('button', { type: 'button', class: 'btn primario', onclick: cerrar }, 'Cerrar la votación'),
    h('div', { class: 'seccion' }, h('h3', null, 'Acciones en votación'), h('ul', { class: 'items' }, v.votacion.acciones.map(x => h('li', { class: 'chico' }, x.texto)))),
    h('div', { class: 'seccion' }, h('h3', null, 'Temas publicados'), temasPublicados(v)),
  ];
}

function cierre(ctx) {
  const { v, codigo, token } = ctx;
  const max = Math.max(1, ...(v.votacion?.resultados || []).map(r => r.fichas));
  const acta = v.acta;
  const descargar = `/api/salas/${codigo}/acta.md?token=${encodeURIComponent(token)}`;
  let actaUI;
  if (acta.estado === 'vacio') {
    actaUI = [
      h('p', { class: 'chico suave' }, 'La IA redacta el acta para el Product Owner y para quien no estuvo, con un criterio verificable por misión. La revisas antes de publicarla.'),
      h('div', { class: 'fila' }, h('button', { type: 'button', class: 'btn calido', onclick: () => ctx.accion('generarActa') }, icono('chispa'), 'Preparar acta con IA'),
        h('button', { type: 'button', class: 'btn texto chico', onclick: () => ctx.accion('cerrarRetro') }, 'Cerrar sin acta')),
    ];
  } else if (acta.estado === 'procesando') {
    actaUI = [h('p', { class: 'nota', role: 'status' }, 'Redactando el acta…')];
  } else {
    actaUI = [
      acta.estado === 'error' ? h('p', { class: 'nota error' }, `No se pudo redactar con IA. ${acta.error} Te dejamos una base con los datos de la sesión para completarla.`) : h('p', { class: 'chico suave' }, 'Edita lo que haga falta. Se guarda al salir del cuadro.'),
      h('label', { class: 'sr', for: 'acta' }, 'Texto del acta'),
      h('textarea', { class: 'input acta-editor', id: 'acta', 'data-k': 'acta', value: acta.texto || '', onchange: e => ctx.accion('editarActa', { texto: e.target.value }) }),
      h('details', null, h('summary', null, 'Vista previa'), markdownSimple(acta.texto)),
      h('div', { class: 'fila' },
        h('a', { class: 'btn chico', href: descargar, download: `acta-sprint-${v.sala.sprint}.md` }, icono('descargar'), 'Descargar'),
        botonEscuchar(String(acta.texto || '').replace(/[#*]/g, ''))),
      h('button', { type: 'button', class: 'btn primario ancho', onclick: async () => {
        const area = document.getElementById('acta');
        if (area && area.value !== acta.texto && !(await ctx.accion('editarActa', { texto: area.value }))) return;
        ctx.accion('cerrarRetro');
      } }, 'Publicar acta y cerrar la retro'),
    ];
  }
  return [
    h('div', { class: 'pila g8' }, h('h2', null, 'Misiones del sprint'), v.votacion?.noVotaron ? h('p', { class: 'chico suave' }, `${plural(v.votacion.noVotaron, 'persona no votó', 'personas no votaron')}.`) : null),
    estandartes(v.misiones),
    v.misiones.length ? h('div', { class: 'pila g8' },
      h('strong', { class: 'chico' }, 'Responsables'),
      h('datalist', { id: 'integrantes' }, v.integrantes.map(n => h('option', { value: n }))),
      v.misiones.map(m => h('label', { class: 'campo' }, h('span', { class: 'chico' }, m.texto),
        h('input', { class: 'input', 'data-k': `resp-${m.id}`, list: 'integrantes', value: m.responsable, placeholder: 'Sin asignar', maxlength: 40, onchange: e => ctx.accion('responsable', { misionId: m.id, nombre: e.target.value }) })))) : null,
    h('details', { class: 'seccion' }, h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, 'Resultado completo de la votación'),
      h('ul', { class: 'items', style: { marginTop: '10px' } }, (v.votacion?.resultados || []).map(r => h('li', { class: 'pila g8' },
        h('div', { class: 'fila entre chico' }, h('span', null, r.texto), h('strong', null, r.fichas)),
        h('div', { class: 'barra-voto', role: 'presentation' }, h('span', { style: { width: `${(r.fichas / max) * 100}%` } })))))),
    h('div', { class: 'seccion' }, h('h3', null, 'Acta del sprint'), actaUI),
  ];
}

function cerrada(ctx) {
  const { v } = ctx;
  return [
    h('h2', null, 'Retrospectiva cerrada'),
    h('p', { class: 'suave' }, 'El sprint quedó guardado en la evolución del equipo. En la próxima retro, la IA revisará si estas misiones funcionaron.'),
    estandartes(v.misiones),
    v.acta.texto ? h('details', { class: 'seccion' }, h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, 'Acta publicada'), markdownSimple(v.acta.texto)) : null,
    h('div', { class: 'fila' }, h('a', { class: 'btn primario', href: `#/equipo/${v.sala.equipo.id}` }, icono('historia'), 'Ver la evolución del equipo'), h('a', { class: 'btn', href: '#/' }, 'Ir al inicio')),
  ];
}

export function panelFacilitador(ctx) {
  const f = ctx.v.sala.fase;
  if (f === 'colocacion') return colocacion(ctx);
  if (f === 'comentarios') return comentarios(ctx);
  if (f === 'analisis') return analisis(ctx);
  if (f === 'votacion') return votacion(ctx);
  if (f === 'cierre') return cierre(ctx);
  return cerrada(ctx);
}

export { aviso };
