import { h, montar, plural, RAZONES, ORIGEN, resumenDistribucion, direccionSala } from '../ui.js';
import { conectarSala } from '../api.js';
import { paisaje, nombreClima } from '../paisaje.js';
import { hablar, hayLectura } from '../voz.js';
import { icono } from '../iconos.js';
import { estandartes } from './miembro.js';
import { formatoReloj } from './sala.js';

export function vistaProyector(app, codigo, token) {
  let v = null;
  let vozActiva = false;
  let ultimoEco = null;
  let firma = '';
  let reveladaAntes = null;
  let ocultarSubtitulo = null;

  const marco = h('div', { class: 'marco' });
  const host = h('span', null, location.host);
  const entra = h('h1', { class: 'entra' }, 'Entra en ', host, ' con el código ', h('b', null, codigo));
  direccionSala().then(d => { host.textContent = d; });
  const lateral = h('div', { class: 'lateral' });
  const principal = h('div', { class: 'principal' }, marco);
  const fase = h('span', { class: 'chip' });
  const subtitulo = h('div', { class: 'subtitulo-eco', role: 'status', 'aria-live': 'polite' });
  const activar = h('button', { type: 'button', class: 'btn chico', onclick: () => { vozActiva = !vozActiva; activar.lastChild.textContent = vozActiva ? 'Voz de Eco activada' : 'Activar voz de Eco'; if (vozActiva) hablar('La voz de Eco está activada.'); } }, icono('altavoz'), h('span', null, 'Activar voz de Eco'));

  montar(app, h('div', { class: 'proyector' },
    h('header', null,
      h('img', { src: 'marca/logo-claro.png', alt: 'RetroScape' }),
      entra,
      h('span', { style: { flex: 1 } }), fase, hayLectura ? activar : null),
    h('main', { id: 'principal', class: 'cuerpo' }, principal, lateral),
    subtitulo));

  const puntos = (total, hechos, etiqueta) => h('div', { class: 'puntos', role: 'img', 'aria-label': `${hechos} de ${total} ${etiqueta}` },
    Array.from({ length: Math.max(total, hechos) }, (_, i) => h('span', { class: `punto${i < hechos ? ' lleno' : ''}` })));

  function contenido() {
    const f = v.sala.fase;
    const reloj = v.temporizador ? h('p', { class: 'reloj grande', 'data-fin': v.temporizador.fin }, icono('reloj'), h('span', null, formatoReloj(v.temporizador.fin))) : null;
    if (f === 'colocacion') {
      return { lateral: [h('h2', null, '¿Cómo vivieron el sprint?'),
        h('p', { class: 'gran-numero' }, `${v.progreso.colocados} de ${v.progreso.total}`), puntos(v.progreso.total, v.progreso.colocados, 'ya se colocaron'), h('p', { class: 'suave' }, 'ya se colocaron. Las posiciones se revelan a la vez.'), reloj,
        v.previo ? h('div', { class: 'tarjeta' }, h('strong', null, `Lo que acordamos en el sprint ${v.previo.sprint}`), h('ul', { class: 'lista-misiones' }, v.previo.misiones.map(m => h('li', null, icono('bandera'), m)))) : null] };
    }
    if (f === 'comentarios') {
      return { lateral: [h('h2', null, v.revelada ? `Clima: ${nombreClima(v.distribucion).toLowerCase()}` : 'Revelando…'),
        v.revelada ? h('p', { class: 'grande-texto' }, resumenDistribucion(v.distribucion)) : null,
        v.razones ? h('div', { class: 'etiquetas' }, Object.entries(v.razones).sort((a, b) => b[1] - a[1]).map(([k, n]) => h('span', { class: 'chip' }, `${RAZONES[k]} ${n}`))) : null,
        h('div', { class: 'tarjeta' }, h('strong', null, 'Deja tu comentario anónimo'), h('p', { class: 'gran-numero' }, v.comentarios.total), h('p', { class: 'suave' }, v.comentarios.total === 1 ? 'comentario hasta ahora' : 'comentarios hasta ahora')), reloj] };
    }
    if (f === 'analisis') return { lateral: [h('h2', null, 'Preparando el análisis'), h('p', { class: 'suave grande-texto' }, 'La IA agrupa los comentarios y quien facilita revisa el borrador antes de mostrarlo.')] };
    if (f === 'votacion') {
      const temas = v.analisis.temas || [];
      const max = Math.max(1, ...temas.map(t => t.cantidad));
      return {
        principal: h('div', { class: 'tablero' },
          h('section', null, h('h2', null, 'Lo que dijo el equipo'),
            h('ul', { class: 'barras' }, temas.map(t => h('li', null,
              h('div', { class: 'fila entre' }, h('span', null, t.nombre, t.recurrente ? h('span', { class: 'chip oro' }, icono('repetir'), 'Vuelve a aparecer') : null), h('b', null, t.cantidad)),
              h('div', { class: 'barra' }, h('span', { style: { width: `${(t.cantidad / max) * 100}%` } })))))),
          h('section', null, h('h2', null, 'Acciones en votación'),
            h('ul', { class: 'tarjetas-accion' }, v.votacion.acciones.map(a => h('li', { class: `origen-${a.origen}` }, h('span', { class: 'origen' }, ORIGEN[a.origen]), a.texto))))),
        lateral: [h('h2', null, 'A votar'), h('p', { class: 'gran-numero' }, `${v.progreso.votaron} de ${v.progreso.totalVotantes}`), puntos(v.progreso.totalVotantes, v.progreso.votaron, 'ya votaron'),
          h('p', { class: 'suave' }, 'ya votaron. Cada uno reparte 3 fichas desde su celular; nadie ve los votos hasta el cierre.'), reloj],
      };
    }
    return {
      principal: h('div', { class: 'tablero' }, h('section', null, h('h2', null, 'Misiones del próximo sprint'), estandartes(v.misiones),
        v.congeladas?.length ? h('p', { class: 'suave' }, `${plural(v.congeladas.length, 'idea quedó congelada', 'ideas quedaron congeladas')} para otro sprint.`) : null)),
      lateral: [h('h2', null, f === 'cerrada' ? 'Retro cerrada' : 'Misiones y acta'), v.distribucion ? h('p', { class: 'grande-texto' }, `Clima: ${nombreClima(v.distribucion).toLowerCase()}`) : null,
        h('p', { class: 'suave' }, f === 'cerrada' ? 'El acta ya está publicada para todo el equipo.' : 'Quien facilita está preparando el acta.')],
    };
  }

  function render() {
    fase.textContent = v.sala.faseNombre;
    const animar = v.revelada && reveladaAntes === false;
    if (animar) reveladaAntes = true;
    const misiones = ['cierre', 'cerrada'].includes(v.sala.fase) ? v.misiones || [] : [];
    const f = JSON.stringify([v.avatares, v.revelada, v.distribucion, misiones.map(m => m.texto)]);
    if (f !== firma || animar) {
      firma = f;
      marco.replaceChildren(paisaje({ avatares: v.avatares, distribucion: v.distribucion, revelada: v.revelada, animar, misiones, titulo: 'Paisaje del equipo' }));
    }
    const c = contenido();
    if (c.principal) { montar(principal, c.principal); montar(lateral, marco, c.lateral); }
    else { montar(principal, marco); montar(lateral, c.lateral); }
    const u = v.ecoUltimo;
    if (u && u.id !== ultimoEco) {
      const primero = ultimoEco === null;
      ultimoEco = u.id;
      montar(subtitulo, h('span', { class: 'orbe', 'aria-hidden': 'true' }), h('div', null, u.voz ? h('p', null, u.voz) : null, u.proyector ? h('p', { class: 'suave', style: { fontSize: '1rem' } }, u.proyector) : null));
      clearTimeout(ocultarSubtitulo);
      ocultarSubtitulo = setTimeout(() => montar(subtitulo), primero ? 0 : 15000);
      if (!primero && vozActiva && u.vozEn === 'proyector' && u.voz) hablar(u.voz);
    }
  }

  const desconectar = conectarSala(codigo, token, {
    alEstado: nuevo => {
      if (reveladaAntes === null) reveladaAntes = nuevo.revelada || !!nuevo.revelacion;
      else if (!v?.revelacion && nuevo.revelacion) reveladaAntes = false;
      v = nuevo;
      render();
    },
    alRechazo: err => montar(app, h('main', { class: 'pagina' }, h('div', { class: 'tarjeta' }, h('h1', null, 'No se pudo abrir la vista del proyector'), h('p', null, err.message)))),
  });
  const reloj = setInterval(() => document.querySelectorAll('.reloj[data-fin]').forEach(el => { el.lastElementChild.textContent = formatoReloj(Number(el.dataset.fin)); }), 500);
  return () => { desconectar(); clearInterval(reloj); clearTimeout(ocultarSubtitulo); };
}
