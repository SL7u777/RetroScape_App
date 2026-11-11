import { h, montar, aviso } from '../ui.js';
import { perfil, guardarPerfil } from '../perfil.js';
import { icono } from '../iconos.js';
import { hayDictado } from '../voz.js';

export function vistaPreferencias(app) {
  const dibujar = () => {
    const p = perfil();
    const pref = (k, valor) => { guardarPerfil({ prefs: { ...p.prefs, [k]: valor } }); dibujar(); };
    const interruptor = (k, titulo, detalle) => h('button', { type: 'button', class: 'zona-btn', style: { minHeight: 'auto' }, 'aria-pressed': String(!!p.prefs[k]), onclick: () => pref(k, !p.prefs[k]) },
      h('strong', null, titulo), h('span', null, detalle));
    const nombre = h('input', { class: 'input', id: 'pnombre', value: p.nombre, maxlength: 30 });
    const ultimas = p.emociones.slice(-8).reverse();

    montar(app, h('main', { id: 'principal', class: 'pagina', style: { maxWidth: '760px' } },
      h('div', { class: 'pagina-top' }, h('button', { type: 'button', class: 'btn texto chico', onclick: () => (history.length > 1 ? history.back() : (location.hash = '#/')) }, icono('atras'), 'Volver'), h('img', { src: 'marca/logo.png', alt: 'RetroScape', width: 120, height: 36 })),
      h('div', { class: 'pila g8' }, h('h1', null, 'Preferencias'), h('p', { class: 'suave' }, 'Se guardan en este dispositivo y se aplican en todas tus retros. No necesitas cuenta.')),
      p.nuevo ? h('p', { class: 'nota' }, 'Estás usando los valores por defecto. Ajústalos cuando quieras.') : null,

      h('section', { class: 'tarjeta' },
        h('h2', null, 'Lectura'),
        h('div', { class: 'pila g8' }, h('span', { class: 'chico', style: { fontWeight: 600 } }, 'Tamaño del texto'),
          h('div', { class: 'opciones' }, [[1, 'Normal'], [1.15, 'Grande'], [1.3, 'Muy grande']].map(([n, t]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': String(p.prefs.texto === n), onclick: () => pref('texto', n) }, t)))),
        h('div', { class: 'zonas' },
          interruptor('contraste', 'Alto contraste', 'Textos y bordes más marcados.'),
          interruptor('sinAnimacion', 'Sin animaciones', 'El paisaje y las fichas no se mueven.'),
          interruptor('enfoque', 'Modo enfoque', 'Menos estímulos: sin animaciones y lo justo en pantalla.'))),

      h('section', { class: 'tarjeta' },
        h('h2', null, 'Voz'),
        hayDictado ? null : h('p', { class: 'nota oro' }, 'Este navegador no tiene dictado. Usa Chrome o Edge para comentar por voz.'),
        h('div', { class: 'pila g8' }, h('span', { class: 'chico', style: { fontWeight: 600 } }, 'Cuánto espera el dictado antes de cortar'),
          h('div', { class: 'opciones' }, [[1200, 'Poco'], [1800, 'Normal'], [3200, 'Bastante']].map(([n, t]) => h('button', { type: 'button', class: 'opcion', 'aria-pressed': String(p.dictado.espera === n), onclick: () => { guardarPerfil({ dictado: { ...p.dictado, espera: n } }); dibujar(); } }, t))),
          h('p', { class: 'chico suave' }, 'Si sueles corregir lo que dictas, RetroScape te sugerirá esperar más.'))),

      h('section', { class: 'tarjeta' },
        h('h2', null, 'Tu perfil'),
        h('label', { class: 'campo', for: 'pnombre' }, 'Nombre que usas al entrar', nombre),
        h('button', { type: 'button', class: 'btn', style: { alignSelf: 'flex-start' }, onclick: () => { guardarPerfil({ nombre: nombre.value.trim() }); aviso('Nombre guardado'); } }, 'Guardar nombre'),
        h('div', { class: 'pila g8' }, h('strong', null, 'Emociones que confirmaste'),
          ultimas.length ? h('div', { class: 'etiquetas' }, ultimas.map(e => h('span', { class: 'chip gris' }, `${e.emocion}${e.sprint ? `, sprint ${e.sprint}` : ''}`))) : h('p', { class: 'chico suave' }, 'Aún no confirmaste ninguna.'),
          h('p', { class: 'chico suave' }, 'Solo tú las ves. Nunca se envían a la sala.')),
        h('button', { type: 'button', class: 'btn texto chico peligro', style: { alignSelf: 'flex-start' }, onclick: () => {
          try { localStorage.removeItem('retroscape.perfil'); } catch { /* sin almacenamiento */ }
          aviso('Perfil borrado. Se usan los valores por defecto.');
          dibujar();
        } }, 'Borrar mi perfil de este dispositivo'))));
  };
  dibujar();
}
