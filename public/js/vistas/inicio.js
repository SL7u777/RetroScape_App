import { h, montar, aviso } from '../ui.js';
import { pedir } from '../api.js';
import { perfil, guardarPerfil, guardarCredencial, salasGuardadas, credencial } from '../perfil.js';
import { paisaje } from '../paisaje.js';
import { icono } from '../iconos.js';

const normalizarCodigo = t => {
  const d = String(t).toUpperCase().replace(/[^0-9]/g, '').slice(0, 4);
  return d.length === 4 ? `RS-${d}` : String(t).toUpperCase().trim();
};

function irASala(codigo) {
  const destino = `#/sala/${codigo}`;
  // Si ya se está en esa dirección (enlace directo), el cambio de hash no ocurre y hay que rutear a mano
  if (location.hash === destino) dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = destino;
}

export async function entrarASala(codigo, nombre) {
  if (credencial(codigo)?.rol) { irASala(codigo); return; }
  const r = await pedir(`/api/salas/${encodeURIComponent(codigo)}/unirse`, { nombre });
  guardarCredencial(r.codigo, { token: r.token, rol: 'miembro', nombre: r.nombre });
  guardarPerfil({ nombre });
  irASala(r.codigo);
}

export function vistaInicio(app, params) {
  const p = perfil();
  const demo = [
    { zona: 'cima', nombre: null }, { zona: 'cima', nombre: null }, { zona: 'valle', nombre: 'Rosa' }, { zona: 'valle', nombre: null },
    { zona: 'valle', nombre: null }, { zona: 'tormenta', nombre: null },
  ];

  const codigo = h('input', { class: 'input codigo', id: 'codigo', inputmode: 'numeric', autocomplete: 'off', placeholder: 'RS-0000', value: params.get('codigo') || '', 'aria-describedby': 'ayuda-codigo' });
  const nombre = h('input', { class: 'input', id: 'nombre', autocomplete: 'given-name', maxlength: 30, value: p.nombre });
  const errorUnirse = h('p', { class: 'nota error oculto', role: 'alert' });

  const formUnirse = h('form', { class: 'tarjeta destacada', onsubmit: async e => {
    e.preventDefault();
    errorUnirse.classList.add('oculto');
    const c = normalizarCodigo(codigo.value);
    if (!/^RS-\d{4}$/.test(c)) { errorUnirse.textContent = 'El código tiene la forma RS-0000. Pídeselo a quien facilita.'; errorUnirse.classList.remove('oculto'); codigo.focus(); return; }
    if (!nombre.value.trim()) { errorUnirse.textContent = 'Escribe tu nombre. Solo se mostrará si tú lo decides.'; errorUnirse.classList.remove('oculto'); nombre.focus(); return; }
    try { await entrarASala(c, nombre.value.trim()); } catch (err) { errorUnirse.textContent = err.message; errorUnirse.classList.remove('oculto'); }
  } },
  h('h2', null, 'Unirme a una retro'),
  h('label', { class: 'campo', for: 'codigo' }, 'Código de la sala', codigo, h('span', { id: 'ayuda-codigo', class: 'suave chico' }, 'Te lo da quien facilita. Basta con los cuatro números.')),
  h('label', { class: 'campo', for: 'nombre' }, 'Tu nombre', nombre, h('span', { class: 'suave chico' }, 'Tu posición y tus comentarios son anónimos.')),
  errorUnirse,
  h('button', { class: 'btn primario', type: 'submit' }, 'Entrar a la sala'));

  const equipo = h('input', { class: 'input', id: 'equipo', list: 'equipos', maxlength: 40, autocomplete: 'off', placeholder: 'Ej. Equipo Atlas' });
  const sprint = h('input', { class: 'input', id: 'sprint', type: 'number', min: 1, inputmode: 'numeric' });
  const facil = h('input', { class: 'input', id: 'facil', maxlength: 30, value: p.nombre });
  const lista = h('datalist', { id: 'equipos' });
  let equipos = [];
  equipo.addEventListener('input', () => {
    const e = equipos.find(x => x.nombre.toLowerCase() === equipo.value.trim().toLowerCase());
    sprint.placeholder = e ? String(e.ultimoSprint + 1) : '1';
  });
  const errorCrear = h('p', { class: 'nota error oculto', role: 'alert' });
  const formCrear = h('form', { class: 'tarjeta', onsubmit: async e => {
    e.preventDefault();
    errorCrear.classList.add('oculto');
    try {
      const r = await pedir('/api/salas', { equipo: equipo.value, sprint: sprint.value || sprint.placeholder, facilitador: facil.value });
      guardarCredencial(r.codigo, { token: r.token, rol: 'facilitador', nombre: facil.value });
      if (facil.value.trim()) guardarPerfil({ nombre: facil.value.trim() });
      location.hash = `#/sala/${r.codigo}`;
    } catch (err) { errorCrear.textContent = err.message; errorCrear.classList.remove('oculto'); }
  } },
  h('h2', null, 'Facilitar una retro'),
  h('label', { class: 'campo', for: 'equipo' }, 'Equipo', equipo, lista),
  h('div', { class: 'fila', style: { alignItems: 'flex-start' } },
    h('label', { class: 'campo', for: 'sprint', style: { flex: '1 1 110px' } }, 'Sprint', sprint),
    h('label', { class: 'campo', for: 'facil', style: { flex: '2 1 180px' } }, 'Tu nombre', facil)),
  errorCrear,
  h('button', { class: 'btn', type: 'submit' }, 'Crear sala'));

  const recientes = Object.entries(salasGuardadas()).sort((a, b) => b[1].fecha - a[1].fecha).slice(0, 3);
  const estadoIA = h('span');
  const equiposPie = h('span', { class: 'fila' });

  montar(app, h('div', { class: 'inicio' },
    h('header', { class: 'inicio-top' },
      h('img', { src: 'marca/logo.png', alt: 'RetroScape', width: 134, height: 40 }),
      h('a', { class: 'btn texto chico', href: '#/preferencias' }, icono('ajustes'), 'Preferencias')),
    h('main', { id: 'principal', class: 'inicio-cuerpo' },
      h('section', { class: 'inicio-hero' },
        h('h1', null, '¿Cómo viviste el sprint?'),
        h('p', null, 'Colócate en el paisaje del equipo, comenta sin que se sepa quién eres y decidan juntos qué cambiar. La IA ordena lo que se dijo; las decisiones son del equipo.'),
        h('div', { class: 'marco', 'aria-hidden': 'true' }, paisaje({ avatares: demo, distribucion: { cima: 2, valle: 3, tormenta: 1 }, revelada: true, titulo: 'Ejemplo de paisaje' }))),
      h('section', { class: 'inicio-forms' },
        formUnirse,
        formCrear,
        recientes.length ? h('div', { class: 'tarjeta' }, h('h3', null, 'Tus salas recientes'),
          h('ul', { class: 'items' }, recientes.map(([c, d]) => h('li', null, h('a', { class: 'btn ancho', href: `#/sala/${c}`, style: { justifyContent: 'space-between' } }, h('span', null, c), h('span', { class: 'suave chico' }, d.rol === 'facilitador' ? 'Facilitas' : d.nombre)))))) : null,
        h('div', { class: 'inicio-pie suave' }, estadoIA, equiposPie)))));

  pedir('/api/estado').then(r => {
    estadoIA.replaceWith(h('span', { class: `chip ia${r.ia.simulado ? ' simulada' : ''}`, title: r.ia.motivo || '' }, icono('chispa'), r.ia.simulado ? 'IA simulada (pruebas)' : `IA: ${r.ia.nombre}, ${r.ia.modelo}`));
  }).catch(() => {});
  pedir('/api/equipos').then(r => {
    equipos = r;
    lista.replaceChildren(...r.map(e => h('option', { value: e.nombre })));
    equiposPie.replaceChildren(...r.filter(e => e.ultimoSprint).map(e => h('a', { href: `#/equipo/${e.id}` }, `Evolución de ${e.nombre}`)));
  }).catch(err => aviso(err.message, 'error'));
  if (params.get('codigo')) nombre.focus(); else codigo.focus({ preventScroll: true });
}
