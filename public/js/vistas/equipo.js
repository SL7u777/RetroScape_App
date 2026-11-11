import { h, montar, plural, markdownSimple } from '../ui.js';
import { pedir } from '../api.js';
import { icono } from '../iconos.js';

const ESTADO = { persiste: ['Siguió ocurriendo', 'error'], mejora: ['Mejoró', 'teal'], sin_evidencia: ['Sin evidencia', 'gris'] };

export function vistaEquipo(app, id) {
  montar(app, h('main', { id: 'principal', class: 'pagina' }, h('p', { class: 'suave' }, 'Cargando…')));
  pedir(`/api/equipos/${encodeURIComponent(id)}`).then(eq => {
    const hist = eq.historial;
    const recurrentes = new Map();
    hist.forEach(s => s.temas.forEach(t => {
      const k = t.canonico || t.nombre;
      recurrentes.set(k, [...(recurrentes.get(k) || []), s.sprint]);
    }));
    const vuelven = [...recurrentes.entries()].filter(([, s]) => s.length >= 2).sort((a, b) => b[1].length - a[1].length);
    const seguimiento = hist.flatMap(s => s.seguimiento.map(x => ({ ...x, revisado: s.sprint })));

    montar(app, h('main', { id: 'principal', class: 'pagina' },
      h('div', { class: 'pagina-top' },
        h('a', { class: 'btn texto chico', href: '#/' }, icono('atras'), 'Inicio'),
        h('img', { src: 'marca/logo.png', alt: 'RetroScape', width: 120, height: 36 })),
      h('div', { class: 'pila g8' }, h('h1', null, `Evolución de ${eq.nombre}`), h('p', { class: 'suave' }, `${plural(hist.length, 'sprint registrado', 'sprints registrados')}. Las posiciones son anónimas: solo se guarda cuántos hubo en cada zona.`)),
      hist.length < 2 ? h('p', { class: 'nota' }, 'Se necesitan al menos 2 sprints para ver tendencias.') : null,

      h('section', { class: 'tarjeta' },
        h('h2', null, 'Clima del equipo por sprint'),
        h('div', { class: 'leyenda', 'aria-hidden': 'true' }, h('span', null, h('i', { style: { background: 'var(--durazno)' } }), 'Cima'), h('span', null, h('i', { style: { background: 'var(--teal)' } }), 'Valle'), h('span', null, h('i', { style: { background: 'var(--tormenta)' } }), 'Tormenta')),
        h('div', { class: 'serie' }, hist.map(s => {
          const d = s.distribucion;
          const n = d.cima + d.valle + d.tormenta || 1;
          return h('div', { class: 'fila-sprint' },
            h('strong', null, `Sprint ${s.sprint}`),
            h('div', { class: 'apilada', role: 'img', 'aria-label': `Sprint ${s.sprint}: ${d.cima} en la cima, ${d.valle} en el valle, ${d.tormenta} en la tormenta` },
              ['cima', 'valle', 'tormenta'].filter(z => d[z]).map(z => h('span', { class: z, style: { width: `${(d[z] / n) * 100}%` } }, d[z]))),
            h('span', { class: 'chico suave' }, plural(s.participantes, 'participante', 'participantes')));
        }))),

      h('div', { class: 'rejilla-2' },
        h('section', { class: 'tarjeta' },
          h('h2', null, 'Temas que vuelven'),
          vuelven.length ? h('ul', { class: 'items' }, vuelven.map(([t, s]) => h('li', { class: 'item' }, h('strong', null, t), h('span', { class: 'chico suave' }, `Sprints ${s.join(', ')}`)))) : h('p', { class: 'suave' }, 'Ningún tema se repitió todavía.'),
          h('p', { class: 'chico suave' }, 'La IA reconoce el mismo problema aunque se nombre distinto en cada sprint.')),
        h('section', { class: 'tarjeta' },
          h('h2', null, '¿Funcionaron las misiones?'),
          seguimiento.length ? h('ul', { class: 'items' }, seguimiento.map(x => h('li', { class: 'item' },
            h('div', { class: 'cabeza' }, h('strong', null, x.texto), h('span', { class: `chip ${ESTADO[x.estado][1]}` }, ESTADO[x.estado][0])),
            h('span', { class: 'chico suave' }, `Revisada en el sprint ${x.revisado}${x.explicacion ? `. ${x.explicacion}` : ''}`)))) : h('p', { class: 'suave' }, 'Aún no hay seguimiento. Se calcula desde la segunda retro con RetroScape.'))),

      h('section', { class: 'tarjeta' },
        h('h2', null, 'Sprint por sprint'),
        h('ul', { class: 'items' }, [...hist].reverse().map(s => h('li', { class: 'item' },
          h('div', { class: 'cabeza' }, h('h3', null, `Sprint ${s.sprint}`), s.cerradoEn ? h('span', { class: 'chip gris' }, new Date(s.cerradoEn).toLocaleDateString('es-PE')) : h('span', { class: 'chip gris' }, 'Datos de ejemplo')),
          h('div', { class: 'etiquetas' }, s.temas.map(t => h('span', { class: 'chip gris' }, t.nombre))),
          s.misiones.length ? h('div', { class: 'pila g8' }, s.misiones.map(m => h('div', { class: 'fila chico', style: { gap: '8px' } }, icono('bandera'), h('span', null, m.texto, m.responsable ? h('span', { class: 'suave' }, `, ${m.responsable}`) : null)))) : null,
          s.acta ? h('details', null, h('summary', null, 'Ver acta'), markdownSimple(s.acta)) : null)))),
    ));
  }).catch(err => montar(app, h('main', { class: 'pagina' }, h('div', { class: 'tarjeta' }, h('h1', null, 'No se encontró el equipo'), h('p', null, err.message), h('a', { class: 'btn', href: '#/' }, 'Volver al inicio')))));
}
