import { svg, ZONAS } from './ui.js';

let instancia = 0;

const CIELOS = {
  calma: ['#6E5CB8', '#F29E7C', '#FFD9A0'],
  neutro: ['#4A3F8F', '#A98BB5', '#E8CDBE'],
  tormenta: ['#1E1846', '#474B68', '#7E84A3'],
};

const mezclar = (a, b, t) => {
  const c = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16));
  const [r, g, bl] = c(a).map((v, i) => Math.round(v + (c(b)[i] - v) * t));
  return `#${[r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

export function nombreClima(d) {
  const c = clima(d);
  return c > 0.34 ? 'Despejado' : c < -0.34 ? 'Tormentoso' : c > 0.1 ? 'Mayormente estable' : c < -0.1 ? 'Nublado' : 'Variable';
}

// -1 (todos en tormenta) a 1 (todos en la cima)
export function clima(d) {
  const n = d ? d.cima + d.valle + d.tormenta : 0;
  return n ? (d.cima - d.tormenta) / n : 0;
}

function cielo(valor) {
  const [de, a, t] = valor >= 0 ? [CIELOS.neutro, CIELOS.calma, valor] : [CIELOS.neutro, CIELOS.tormenta, -valor];
  return de.map((c, i) => mezclar(c, a[i], t));
}

const PUESTOS = {
  cima: [[228, 226], [262, 224], [292, 223], [176, 266], [326, 254], [130, 338], [372, 326], [105, 385], [396, 378], [80, 432], [420, 430], [60, 470]],
  valle: [[540, 498], [610, 494], [680, 498], [470, 502], [750, 502], [505, 548], [575, 545], [645, 545], [715, 548], [435, 552], [785, 552], [610, 586]],
  tormenta: [[930, 505], [1000, 503], [1070, 505], [860, 508], [1140, 508], [900, 550], [970, 548], [1040, 548], [1110, 550], [830, 552], [1170, 553], [1000, 590]],
};
const COLUMNAS = { cima: 0, valle: 400, tormenta: 800 };

function figura(x, y, { propio, nombre, silueta, demora, escala = 1.3 }) {
  const g = svg('g', { class: `avatar${demora !== undefined ? ' cae' : ''}`, transform: `translate(${x} ${y}) scale(${escala})`, style: demora !== undefined ? `--d:${demora}ms` : null });
  const relleno = silueta ? 'none' : propio ? '#FFCF7A' : '#FFFDF8';
  const trazo = silueta ? '#FFFFFF' : '#22184F';
  if (!silueta) g.append(svg('ellipse', { cx: 0, cy: 2, rx: 16, ry: 4, fill: 'rgba(20,14,50,.28)' }));
  g.append(
    svg('path', { d: 'M-14 0C-14-18-9-26 0-26S14-18 14 0Z', fill: relleno, stroke: trazo, 'stroke-width': 2.5, 'stroke-dasharray': silueta ? '4 4' : null }),
    svg('circle', { cy: -37, r: 11, fill: relleno, stroke: trazo, 'stroke-width': 2.5, 'stroke-dasharray': silueta ? '4 4' : null }),
  );
  const etiqueta = propio ? 'Tú' : silueta ? 'Tu sprint anterior' : nombre;
  if (etiqueta) {
    const ancho = Math.max(30, etiqueta.length * 8.4 + 16);
    const arriba = propio || silueta;
    const yy = arriba ? -74 : 10;
    g.append(
      svg('rect', { x: -ancho / 2, y: yy, width: ancho, height: 22, rx: 11, fill: propio ? '#22184F' : silueta ? 'rgba(34,24,79,.55)' : 'rgba(34,24,79,.82)' }),
      svg('text', { x: 0, y: yy + 15.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, fill: propio ? '#FFCF7A' : '#FFFFFF', 'font-family': 'Inter, sans-serif' }, etiqueta),
    );
  }
  return g;
}

const MASTILES = [[610, 456], [470, 468], [760, 448], [880, 454]];

function bandera(x, y, numero, texto, k) {
  const g = svg('g', { transform: `translate(${x} ${y}) scale(${k})`, role: 'img', 'aria-label': `Misión ${numero}: ${texto}` });
  g.append(svg('g', { class: 'mision', style: `--d:${(numero - 1) * 180}ms` },
    svg('ellipse', { cx: 0, cy: 1, rx: 10, ry: 3, fill: 'rgba(20,14,50,.3)' }),
    svg('rect', { x: -2, y: -96, width: 4, height: 96, rx: 2, fill: '#22184F' }),
    svg('path', { d: 'M2 -94H58L46 -76L58 -58H2Z', fill: '#FFCF7A', stroke: '#22184F', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }),
    svg('text', { x: 24, y: -68, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 700, fill: '#22184F', 'font-family': 'Bricolage Grotesque, Inter, sans-serif' }, String(numero))));
  return g;
}

export function paisaje({ avatares = [], distribucion = null, revelada = false, interactivo = false, elegida = null, alElegir, silueta = null, animar = false, compacto = false, misiones = [], titulo = 'Paisaje del equipo' } = {}) {
  const escala = compacto ? 2 : 1.3;
  const k = compacto ? 1.55 : 1;
  const id = `p${++instancia}`;
  const valor = revelada ? clima(distribucion) : 0;
  const [c1, c2, c3] = cielo(valor);
  const sol = 0.35 + 0.65 * ((valor + 1) / 2);

  const raiz = svg('svg', { class: 'paisaje', viewBox: '0 0 1200 640', role: 'group', 'aria-label': titulo });
  raiz.append(svg('defs', null,
    svg('linearGradient', { id: `${id}c`, class: 'cielo', x1: 0, y1: 0, x2: 0, y2: 1 },
      svg('stop', { offset: 0, style: `stop-color:${c1}` }), svg('stop', { offset: .55, style: `stop-color:${c2}` }), svg('stop', { offset: 1, style: `stop-color:${c3}` })),
    svg('radialGradient', { id: `${id}s` }, svg('stop', { offset: 0, 'stop-color': '#FFE2A8', 'stop-opacity': .9 }), svg('stop', { offset: 1, 'stop-color': '#FFCF7A', 'stop-opacity': 0 })),
    svg('clipPath', { id: `${id}r` }, svg('rect', { x: 820, y: 230, width: 360, height: 250 })),
  ));

  raiz.append(
    svg('rect', { width: 1200, height: 640, fill: `url(#${id}c)` }),
    svg('g', { opacity: sol.toFixed(2) }, svg('circle', { cx: 300, cy: 140, r: 110, fill: `url(#${id}s)` }), svg('circle', { cx: 300, cy: 140, r: 54, fill: '#FFE2A8' })),
    svg('path', { d: 'M0 360C150 300 260 330 400 312C560 288 680 332 820 302C960 272 1080 312 1200 292V640H0Z', fill: '#6E5CB8', opacity: .55 }),
    svg('path', { d: 'M-30 640L150 300L205 228L300 222L355 290L520 640Z', fill: '#3A2A7A' }),
    svg('path', { d: 'M205 228L300 222L322 250L298 244L280 262L258 240L236 258L220 244L190 250Z', fill: '#F3EEFF' }),
    svg('path', { d: 'M0 575C110 545 230 482 360 470C450 462 520 440 600 455C700 475 760 440 860 452C900 456 930 470 960 480V640H0Z', fill: '#2E9C8C' }),
    svg('path', { d: 'M260 640C330 560 450 500 560 512C640 520 720 528 800 508C840 500 870 505 900 515V640Z', fill: '#278B7C' }),
    svg('g', { fill: '#1F6D62' }, ...[[455, 470], [735, 465], [790, 470]].map(([x, y]) => svg('path', { d: `M${x} ${y}l-12 26h24Z` }))),
    svg('path', { d: 'M640 640C700 560 740 500 820 482C890 466 960 472 1040 462C1110 454 1160 472 1220 467V640Z', fill: '#4B4F6B' }),
    svg('g', { class: 'lluvia', stroke: '#B9C0DE', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: .55, 'clip-path': `url(#${id}r)` },
      ...Array.from({ length: 26 }, (_, i) => { const x = 840 + (i * 53) % 340; const y = 230 + (i * 37) % 230; return svg('line', { x1: x, y1: y, x2: x - 10, y2: y + 26 }); })),
    svg('g', { fill: '#3B3F59' }, svg('circle', { cx: 900, cy: 190, r: 60 }), svg('circle', { cx: 990, cy: 160, r: 78 }), svg('circle', { cx: 1090, cy: 185, r: 66 }), svg('circle', { cx: 1160, cy: 215, r: 46 }), svg('rect', { x: 860, y: 190, width: 330, height: 60, rx: 30 })),
    svg('g', { fill: '#575C7A' }, svg('circle', { cx: 960, cy: 150, r: 40 }), svg('circle', { cx: 1040, cy: 140, r: 34 })),
    svg('path', { d: 'M1015 245L985 320H1012L992 392L1052 300H1022L1044 245Z', fill: '#FFCF7A' }),
    svg('path', { d: 'M0 580C200 560 400 594 600 580C800 566 1000 594 1200 575V640H0Z', fill: 'rgba(34,24,79,.35)' }),
  );

  for (const zona of Object.keys(ZONAS)) {
    const x0 = COLUMNAS[zona];
    const cuenta = revelada && distribucion ? distribucion[zona] : null;
    const g = svg('g', {
      class: `zona${interactivo ? ' activa' : ''}${elegida === zona ? ' elegida' : ''}`,
      'data-zona': zona,
      role: interactivo ? 'button' : null,
      tabindex: interactivo ? 0 : null,
      'aria-pressed': interactivo ? String(elegida === zona) : null,
      'aria-label': interactivo ? `Colocarme en ${ZONAS[zona].nombre}: ${ZONAS[zona].frase.toLowerCase()}` : null,
    },
    svg('rect', { class: 'halo', x: x0 + 8, y: 8, width: 384, height: 624, rx: 22, fill: 'rgba(255,255,255,.22)', stroke: '#FFFFFF', 'stroke-width': 3 }),
    svg('rect', { x: x0, y: 0, width: 400, height: 640, fill: 'transparent' }));
    const texto = cuenta !== null ? `${ZONAS[zona].nombre}  ${cuenta}` : ZONAS[zona].nombre;
    const ancho = (texto.length * 13 + 40) * k;
    const alto = 38 * k;
    g.append(svg('rect', { x: x0 + 200 - ancho / 2, y: 628 - alto, width: ancho, height: alto, rx: alto / 2, fill: '#22184F' }),
      svg('text', { x: x0 + 200, y: 628 - alto / 2 + 7.5 * k, 'text-anchor': 'middle', 'font-size': 21 * k, 'font-weight': 700, fill: '#FFFFFF', 'font-family': 'Bricolage Grotesque, Inter, sans-serif' }, texto));
    if (interactivo) {
      g.addEventListener('click', () => alElegir?.(zona));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alElegir?.(zona); } });
    }
    raiz.append(g);
  }

  misiones.slice(0, MASTILES.length).forEach((m, i) => raiz.append(bandera(...MASTILES[i], i + 1, m.texto, compacto ? 1.5 : 1)));

  if (silueta && PUESTOS[silueta]) {
    const [x, y] = PUESTOS[silueta][2];
    raiz.append(figura(x, y, { silueta: true, escala }));
  }
  const usados = { cima: 0, valle: 0, tormenta: 0 };
  avatares.forEach((a, i) => {
    const lista = PUESTOS[a.zona];
    const n = usados[a.zona]++;
    const [x, y] = lista[n % lista.length];
    const extra = Math.floor(n / lista.length) * 14;
    raiz.append(figura(x + extra, y - extra / 2, { propio: a.propio, nombre: a.nombre, demora: animar ? i * 140 : undefined, escala }));
  });
  return raiz;
}
