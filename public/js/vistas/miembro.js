import { h, plural, ZONAS, RAZONES, ORIGEN, resumenDistribucion, markdownSimple, anunciar, aviso } from '../ui.js';
import { recordarPosicion, posicionAnterior, perfil, guardarPerfil } from '../perfil.js';
import { hablar, hayLectura } from '../voz.js';
import { icono } from '../iconos.js';

export function botonEscuchar(texto, etiqueta = 'Escuchar') {
  if (!hayLectura) return null;
  return h('button', { type: 'button', class: 'btn texto chico', onclick: () => { if (!hablar(texto)) aviso('No se pudo reproducir el audio. El texto sigue disponible.', 'error'); } }, icono('altavoz'), etiqueta);
}

export function recordatorio(v) {
  if (!v.previo) return null;
  return h('details', { class: 'seccion secundaria' },
    h('summary', { class: 'chico', style: { cursor: 'pointer', fontWeight: 600 } }, `Lo que acordaron en el sprint ${v.previo.sprint}`),
    h('p', { class: 'chico suave', style: { marginTop: '8px' } }, resumenDistribucion(v.previo.distribucion)),
    h('ul', { class: 'items', style: { marginTop: '8px' } }, v.previo.misiones.map(m => h('li', { class: 'fila', style: { gap: '8px', alignItems: 'flex-start' } }, icono('bandera'), h('span', { class: 'chico' }, m)))));
}

export function estandartes(misiones) {
  if (!misiones.length) return h('p', { class: 'suave' }, 'Ninguna acción recibió fichas.');
  return h('div', { class: 'estandartes', role: 'list' }, misiones.map((m, i) => h('div', { class: 'estandarte', role: 'listitem', style: { '--i': i } },
    icono('bandera'),
    h('div', null, h('b', null, m.texto), h('span', { class: 'chico' }, `${plural(m.fichas, 'ficha', 'fichas')}${m.responsable ? `. Responsable: ${m.responsable}` : ''}`)))));
}

export function temasPublicados(v, abierto = false) {
  if (v.analisis?.estado !== 'publicado') return null;
  return h('ul', { class: 'items' }, v.analisis.temas.map(t => h('li', { class: 'item' },
    h('div', { class: 'cabeza' }, h('strong', null, t.nombre), h('span', { class: 'chip gris' }, plural(t.cantidad, 'comentario', 'comentarios'))),
    h('div', { class: 'etiquetas' },
      t.origen === 'ia' ? h('span', { class: 'chip ia' }, icono('chispa'), 'Sugerido por IA') : null,
      t.recurrente ? h('span', { class: 'chip oro' }, icono('repetir'), `Ya apareció en ${t.recurrente.sprints.length === 1 ? 'el sprint' : 'los sprints'} ${t.recurrente.sprints.join(', ')}`) : null),
    t.resumen ? h('p', { class: 'chico suave' }, t.resumen) : null,
    h('details', { open: abierto || null }, h('summary', null, 'Ver los comentarios'), h('div', { class: 'pila g8', style: { marginTop: '8px' } }, t.comentarios.map(c => h('div', { class: 'cita' }, c)))))));
}

function colocacion(ctx) {
  const { v, local } = ctx;
  if (v.yo.zona && !local.cambiando) {
    const z = ZONAS[v.yo.zona];
    const anterior = posicionAnterior(v.sala.equipo.id, v.sala.sprint);
    return [
      h('div', { class: 'pila g8' },
        h('h2', null, `Estás en ${z.con}`),
        h('p', { class: 'suave' }, `Solo tú lo ves. El paisaje se revela a la vez cuando todos se coloquen. Van ${v.progreso.colocados} de ${v.progreso.total}.`),
        v.yo.razones.length ? h('div', { class: 'etiquetas' }, v.yo.razones.map(r => h('span', { class: 'chip gris' }, RAZONES[r]))) : null,
        h('div', { class: 'fila' },
          h('button', { type: 'button', class: 'btn texto chico', onclick: () => { local.cambiando = true; local.seleccion = v.yo.zona; local.razones = [...v.yo.razones]; ctx.refrescar(); } }, icono('editar'), 'Cambiar mi zona'),
          anterior ? h('button', { type: 'button', class: 'btn texto chico', 'aria-pressed': String(!perfil().ocultarSilueta), onclick: () => { guardarPerfil({ ocultarSilueta: !perfil().ocultarSilueta }); ctx.refrescar(); } }, icono('ojo'), perfil().ocultarSilueta ? 'Mostrar mi sprint anterior' : 'Ocultar mi sprint anterior') : null)),
      h('div', { class: 'seccion' }, h('h3', null, 'Adelanta tu comentario'), h('p', { class: 'suave chico' }, 'Mientras los demás terminan, puedes dejar lo que quieras decir.'), ctx.compositor.el),
      recordatorio(v),
    ];
  }
  const elegir = zona => { local.seleccion = zona; ctx.refrescar(); };
  const alternar = r => {
    local.razones = local.razones.includes(r) ? local.razones.filter(x => x !== r) : local.razones.length < 2 ? [...local.razones, r] : (aviso('Puedes marcar hasta dos razones'), local.razones);
    ctx.refrescar();
  };
  const confirmar = async () => {
    const ok = await ctx.accion('colocar', { zona: local.seleccion, razones: local.razones });
    if (ok) {
      recordarPosicion(v.sala.equipo.id, v.sala.sprint, local.seleccion);
      anunciar(`Tu avatar está en ${ZONAS[local.seleccion].con}. Nadie más lo ve hasta la revelación.`);
      local.cambiando = false;
    }
  };
  return [
    h('div', { class: 'pila g8' },
      h('h2', null, '¿Cómo viviste el sprint?'),
      h('p', { class: 'suave' }, 'Elige una zona aquí o tocando el paisaje. Nadie verá dónde te colocaste hasta que se revele a la vez.')),
    h('div', { class: 'zonas', role: 'group', 'aria-label': 'Zonas del paisaje' }, Object.entries(ZONAS).map(([k, z]) =>
      h('button', { type: 'button', class: 'zona-btn', 'aria-pressed': String(local.seleccion === k), onclick: () => elegir(k) }, icono(z.icono), h('strong', null, z.nombre), h('span', null, z.frase)))),
    h('div', { class: 'pila g8' },
      h('span', { class: 'chico', style: { fontWeight: 600 } }, 'Qué influyó más (opcional, hasta dos)'),
      h('div', { class: 'opciones' }, Object.entries(RAZONES).map(([k, n]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': String(local.razones.includes(k)), onclick: () => alternar(k) }, n))),
      h('p', { class: 'chico suave' }, 'Solo se muestra el total de cada razón, nunca quién la marcó.')),
    h('div', { class: 'fila' },
      h('button', { type: 'button', class: 'btn primario', disabled: !local.seleccion, onclick: confirmar }, local.seleccion ? `Colocarme en ${ZONAS[local.seleccion].nombre}` : 'Elige una zona'),
      local.cambiando ? h('button', { type: 'button', class: 'btn texto', onclick: () => { local.cambiando = false; ctx.refrescar(); } }, 'Cancelar') : null),
    recordatorio(v),
  ];
}

function comentarios(ctx) {
  const { v, local } = ctx;
  if (!v.revelada) return [h('h2', null, 'Revelando el paisaje…'), h('p', { class: 'suave' }, 'Todos verán la distribución al mismo tiempo.')];
  const yo = v.yo.zona ? ZONAS[v.yo.zona] : null;
  return [
    h('div', { class: 'pila g8' },
      h('h2', null, 'Así quedó el paisaje'),
      h('p', null, `${resumenDistribucion(v.distribucion)} ${yo ? `Tú estás en ${yo.con}.` : 'No te colocaste en esta ronda.'}`),
      yo ? h('button', { type: 'button', class: 'btn chico', style: { alignSelf: 'flex-start' }, 'aria-pressed': String(v.yo.mostrarNombre), onclick: () => ctx.accion('mostrarNombre', { valor: !v.yo.mostrarNombre }) },
        icono(v.yo.mostrarNombre ? 'check' : 'ojo'), v.yo.mostrarNombre ? 'Tu nombre se ve en el paisaje' : 'Mostrar mi nombre en el paisaje') : null),
    h('div', { class: 'seccion' },
      h('h3', null, 'Deja un comentario anónimo'),
      h('p', { class: 'suave chico' }, 'Puedes dictarlo o escribirlo. Deja todos los que quieras.'),
      ctx.compositor.el,
      local.enviados.length ? h('details', null, h('summary', { class: 'chico' }, `Enviaste ${plural(local.enviados.length, 'comentario', 'comentarios')} (solo tú ves esta lista)`),
        h('div', { class: 'pila g8', style: { marginTop: '8px' } }, local.enviados.map(t => h('div', { class: 'cita' }, t)))) : null),
    h('p', { class: 'chico suave' }, `Hay ${plural(v.comentarios.total, 'comentario', 'comentarios')} del equipo hasta ahora.`),
  ];
}

function votacion(ctx) {
  const { v, local } = ctx;
  const vt = v.votacion;
  if (!local.votos) local.votos = { ...v.yo.votos };
  const usadas = Object.values(local.votos).reduce((a, b) => a + b, 0);
  const libres = vt.fichas - usadas;
  const cambiar = (id, d) => {
    const n = (local.votos[id] || 0) + d;
    if (n < 0) return;
    if (d > 0 && libres <= 0) { aviso('Ya usaste tus 3 fichas. Quita una para moverla.'); return; }
    local.votos = { ...local.votos, [id]: n };
    ctx.refrescar();
  };
  if (v.yo.votoConfirmado) {
    return [
      h('h2', null, 'Voto confirmado'),
      h('p', { class: 'nota teal' }, `${v.progreso.votaron} de ${v.progreso.totalVotantes} ya votaron. Los resultados se muestran a todos a la vez al cerrar.`),
      h('div', { class: 'seccion' }, h('h3', null, 'Temas del análisis'), temasPublicados(v)),
    ];
  }
  return [
    h('div', { class: 'pila g8' },
      h('h2', null, `Reparte tus ${vt.fichas} fichas`),
      h('p', { class: 'suave' }, 'Pon varias en la misma acción si te importa mucho. Nadie ve los votos hasta el cierre.'),
      h('div', { class: 'fila' }, h('div', { class: 'fichas', 'aria-hidden': 'true' }, Array.from({ length: vt.fichas }, (_, i) => h('span', { class: `ficha${i < usadas ? ' usada' : ''}` }))), h('span', { class: 'chico', role: 'status' }, `Te quedan ${plural(libres, 'ficha', 'fichas')}`))),
    h('ul', { class: 'items' }, vt.acciones.map(a => h('li', { class: 'item' },
      h('strong', null, a.texto),
      h('div', { class: 'etiquetas' }, h('span', { class: `chip${a.origen === 'ia' ? ' ia' : a.origen === 'seguimiento' ? ' oro' : ' teal'}` }, ORIGEN[a.origen]), a.tema ? h('span', { class: 'chip gris' }, a.tema) : null),
      h('div', { class: 'voto', role: 'group', 'aria-label': `Fichas para ${a.texto}` },
        h('button', { type: 'button', 'aria-label': 'Quitar una ficha', disabled: !local.votos[a.id], onclick: () => cambiar(a.id, -1) }, '−'),
        h('output', { 'aria-live': 'polite', class: local.votos[a.id] ? 'ficha-pop' : '' }, local.votos[a.id] || 0),
        h('button', { type: 'button', 'aria-label': 'Poner una ficha', disabled: libres <= 0, onclick: () => cambiar(a.id, +1) }, '+'))))),
    h('button', { type: 'button', class: 'btn primario', disabled: !usadas, onclick: () => ctx.accion('votar', { votos: local.votos, confirmar: true }).then(ok => ok && anunciar('Voto confirmado')) }, 'Confirmar mi voto'),
    h('div', { class: 'seccion secundaria' }, h('h3', null, 'Temas del análisis'), h('p', { class: 'chico suave' }, 'Agrupados por IA y revisados por quien facilita. Puedes leer los comentarios de cada tema.'), temasPublicados(v)),
  ];
}

function cierre(ctx) {
  const { v } = ctx;
  const texto = v.misiones.map((m, i) => `Misión ${i + 1}: ${m.texto}.`).join(' ');
  return [
    h('div', { class: 'pila g8' }, h('h2', null, 'Misiones del próximo sprint'), v.votacion?.noVotaron ? h('p', { class: 'chico suave' }, `${plural(v.votacion.noVotaron, 'persona no votó', 'personas no votaron')}.`) : null),
    estandartes(v.misiones),
    botonEscuchar(texto, 'Escuchar las misiones'),
    v.congeladas.length ? h('div', { class: 'seccion' }, h('h3', null, 'Ideas congeladas'), h('p', { class: 'chico suave' }, 'No se adoptaron ahora, pero quedan guardadas para otro sprint.'), h('ul', { class: 'items' }, v.congeladas.map(c => h('li', { class: 'chico' }, `${c.texto} (${c.fichas ? plural(c.fichas, 'ficha', 'fichas') : 'sin fichas'})`)))) : null,
    h('p', { class: 'nota' }, 'Quien facilita está preparando el acta del sprint.'),
  ];
}

function cerrada(ctx) {
  const { v } = ctx;
  return [
    h('h2', null, 'Retrospectiva cerrada'),
    estandartes(v.misiones),
    v.acta.texto ? h('div', { class: 'seccion' }, h('div', { class: 'fila entre' }, h('h3', null, 'Acta'), botonEscuchar(v.acta.texto.replace(/[#*]/g, ''), 'Escuchar el acta')), markdownSimple(v.acta.texto)) : null,
    h('a', { class: 'btn', href: `#/equipo/${v.sala.equipo.id}` }, icono('historia'), 'Ver la evolución del equipo'),
  ];
}

export function panelMiembro(ctx) {
  const f = ctx.v.sala.fase;
  if (f === 'colocacion') return colocacion(ctx);
  if (f === 'comentarios') return comentarios(ctx);
  if (f === 'analisis') return [h('h2', null, 'Preparando el análisis'), h('p', { class: 'suave' }, 'La IA agrupó los comentarios y quien facilita está revisando el borrador antes de mostrarlo al equipo.'), h('p', { class: 'nota' }, 'Mientras tanto, piensa qué cambiarías en el próximo sprint.')];
  if (f === 'votacion') return votacion(ctx);
  if (f === 'cierre') return cierre(ctx);
  return cerrada(ctx);
}
