import { h, montar, renderConservando, aviso, anunciar, plural, ZONAS, RAZONES, resumenDistribucion, direccionSala } from '../ui.js';
import { conectarSala, accion as enviarAccion } from '../api.js';
import { credencial, perfil, guardarPerfil, posicionAnterior, guardarCredencial } from '../perfil.js';
import { paisaje, nombreClima } from '../paisaje.js';
import { icono } from '../iconos.js';
import { panelMiembro } from './miembro.js';
import { panelFacilitador } from './facilitador.js';
import { crearCompositor } from './compositor.js';
import { montarEco } from './eco.js';
import { entrarASala } from './inicio.js';

const AYUDA = {
  miembro: {
    colocacion: 'Elige la zona que mejor describe tu sprint: cima si fue bien, valle si tuvo altibajos, tormenta si fue difícil. Nadie ve tu posición hasta que se revela la de todos a la vez.',
    comentarios: 'Escribe o dicta lo que pasó en el sprint. Antes de publicar, la IA te avisa si algo podría identificarte o señalar a alguien. Tú decides qué publicar.',
    analisis: 'La IA agrupó los comentarios y quien facilita revisa el borrador. Pronto verás los temas y las acciones para votar.',
    votacion: 'Tienes 3 fichas. Ponlas en las acciones que más te importan, incluso varias en la misma. Nadie ve los votos hasta el cierre.',
    cierre: 'Las acciones con más fichas son las misiones del próximo sprint. Las demás quedan guardadas como ideas congeladas.',
    cerrada: 'La retro terminó. Puedes leer o escuchar el acta y ver cómo evoluciona el equipo.',
  },
  facilitador: {
    colocacion: 'Comparte el código y espera a que se coloquen. Puedes dar tiempo, revelar antes o pedírselo a Eco por voz. No ves las posiciones hasta la revelación.',
    comentarios: 'El equipo deja comentarios anónimos. Cuando terminen, cierra los comentarios para que la IA prepare el borrador del análisis.',
    analisis: 'Revisa el borrador antes de publicarlo: renombra, fusiona o descarta temas, revisa las misiones anteriores y ajusta las acciones.',
    votacion: 'Nadie ve los totales hasta el cierre. La votación se cierra sola cuando todos confirman o vence el tiempo.',
    cierre: 'Asigna responsables, pide el borrador del acta, revísalo y publícalo para cerrar la retro.',
    cerrada: 'El sprint quedó guardado. En la próxima retro, la IA revisará si estas misiones funcionaron.',
  },
};

const ORDEN = ['colocacion', 'comentarios', 'analisis', 'votacion', 'cierre'];
const NOMBRES = { colocacion: 'Colocación', comentarios: 'Comentarios', analisis: 'Análisis', votacion: 'Votación', cierre: 'Misiones y acta' };

export function formatoReloj(fin) {
  const s = Math.max(0, Math.round((fin - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function pedirNombre(app, codigo) {
  const nombre = h('input', { class: 'input', id: 'nombre', maxlength: 30, value: perfil().nombre, autocomplete: 'given-name' });
  const error = h('p', { class: 'nota error oculto', role: 'alert' });
  montar(app, h('main', { id: 'principal', class: 'pagina', style: { maxWidth: '480px', paddingTop: '12vh' } },
    h('img', { src: 'marca/logo.png', alt: 'RetroScape', width: 160, height: 48 }),
    h('form', { class: 'tarjeta destacada', onsubmit: async e => {
      e.preventDefault();
      try { await entrarASala(codigo, nombre.value.trim()); } catch (err) { error.textContent = err.message; error.classList.remove('oculto'); }
    } },
    h('h1', null, `Entrar a ${codigo}`),
    h('label', { class: 'campo', for: 'nombre' }, 'Tu nombre', nombre, h('span', { class: 'suave chico' }, 'Tu posición y tus comentarios son anónimos.')),
    error,
    h('button', { class: 'btn primario', type: 'submit' }, 'Entrar a la sala'))));
  nombre.focus();
}

const pantallaChica = matchMedia('(max-width: 600px)');

export function vistaSala(app, codigo, tokenFacilitador) {
  if (tokenFacilitador) {
    guardarCredencial(codigo, { token: tokenFacilitador, rol: 'facilitador', nombre: '' });
    history.replaceState(null, '', `#/sala/${codigo}`);
  }
  const cred = credencial(codigo);
  if (!cred) { pedirNombre(app, codigo); return () => {}; }

  const local = { seleccion: null, razones: [], cambiando: false, votos: null, enviados: [], confirmarRevelar: false };
  let v = null;
  let firmaPanel = '';
  let firmaPaisaje = '';
  let vioRevelacion = false;
  let reveladaAntes = null;

  const cabecera = h('header', { class: 'cabecera' });
  const pasos = h('nav', { class: 'pasos', 'aria-label': 'Fases de la retrospectiva' });
  const marco = h('div', { class: 'marco' });
  const velo = h('div', { class: 'velo oculto', 'aria-hidden': 'true' });
  const franja = h('div', { class: 'franja' });
  const panel = h('aside', { class: 'panel', 'aria-label': 'Acciones de la fase' });
  const escenario = h('main', { id: 'principal', class: 'escenario' }, h('section', { class: 'lienzo', 'aria-label': 'Paisaje del equipo' }, marco, franja), panel);
  const conexion = h('div', { class: 'nota oro oculto', role: 'status', style: { margin: '12px 20px 0' } }, 'Sin conexión con la sala. Lo confirmado se conserva y se sincroniza al reconectar.');

  montar(app, h('div', { class: 'sala' }, cabecera, pasos, conexion,
    escenario));
  marco.append(velo);

  const ctx = {
    codigo,
    token: cred.token,
    local,
    get v() { return v; },
    accion: async (tipo, datos) => {
      try { await enviarAccion(codigo, cred.token, tipo, datos); return true; } catch (e) { aviso(e.message, 'error'); return false; }
    },
    refrescar: () => render(true),
  };
  ctx.compositor = crearCompositor(ctx);
  let eco = null;

  function dibujarCabecera() {
    const copiar = h('button', { type: 'button', 'aria-label': `Copiar el código ${codigo}`, onclick: async () => {
      try { await navigator.clipboard.writeText(codigo); aviso('Código copiado'); } catch { aviso(`El código es ${codigo}`); }
    } }, icono('copiar'));
    montar(cabecera,
      h('a', { class: 'marca', href: '#/', title: 'Ir al inicio' }, h('img', { src: 'marca/icono.svg', alt: '' }), h('b', null, 'RetroScape')),
      h('div', { class: 'titulo' }, h('h1', null, v.sala.equipo.nombre), h('span', null, `Sprint ${v.sala.sprint}, ${v.rol === 'facilitador' ? 'facilitas tú' : `facilita ${v.sala.facilitador}`}`)),
      h('div', { class: 'espacio' }),
      h('span', { class: `chip ia${v.ia.simulado ? ' simulada' : ''}`, title: v.ia.simulado ? v.ia.motivo : `${v.ia.nombre}, ${v.ia.modelo}` }, icono('chispa'), v.ia.simulado ? 'IA simulada' : `IA: ${v.ia.nombre}`),
      eco ? eco.boton : null,
      h('span', { class: 'codigo-sala' }, codigo, copiar),
      h('a', { class: 'btn texto chico', href: '#/preferencias', 'aria-label': 'Preferencias' }, icono('ajustes')));
  }

  function dibujarPasos() {
    const actual = v.sala.fase === 'cerrada' ? ORDEN.length : ORDEN.indexOf(v.sala.fase);
    montar(pasos, ORDEN.map((f, i) => h('div', { class: `paso${i < actual ? ' hecho' : ''}${i === actual ? ' actual' : ''}`, 'aria-current': i === actual ? 'step' : null },
      h('i', null, i < actual ? '✓' : i + 1), h('span', { class: 'etq' }, NOMBRES[f]))),
      v.sala.fase === 'cerrada' ? h('div', { class: 'paso actual', 'aria-current': 'step' }, h('i', null, '✓'), h('span', { class: 'etq' }, 'Retro cerrada')) : null);
    const el = pasos.querySelector('.actual');
    if (el && pasos.dataset.fase !== v.sala.fase) {
      pasos.dataset.fase = v.sala.fase;
      pasos.scrollLeft = el.offsetLeft - (pasos.clientWidth - el.offsetWidth) / 2;
    }
  }

  function dibujarPaisaje() {
    const miembro = v.rol === 'miembro';
    const colocando = miembro && v.sala.fase === 'colocacion' && !v.revelacion && (!v.yo.zona || local.cambiando);
    const elegida = colocando ? local.seleccion : null;
    const anterior = miembro && v.sala.fase === 'colocacion' && !v.revelacion && !perfil().ocultarSilueta ? posicionAnterior(v.sala.equipo.id, v.sala.sprint) : null;
    const avatares = colocando ? [] : v.avatares;
    const animar = v.revelada && reveladaAntes === false && !vioRevelacion;
    const compacto = pantallaChica.matches;
    const firma = JSON.stringify([avatares, v.revelada, v.distribucion, colocando, elegida, anterior?.zona, compacto]);
    if (firma === firmaPaisaje && !animar) return;
    firmaPaisaje = firma;
    if (animar) vioRevelacion = true;
    const svgPaisaje = paisaje({
      avatares, distribucion: v.distribucion, revelada: v.revelada, interactivo: colocando, elegida, silueta: anterior?.zona, compacto,
      animar, alElegir: zona => { local.seleccion = zona; render(true); },
      titulo: v.revelada ? `Paisaje revelado: ${resumenDistribucion(v.distribucion)}` : 'Paisaje del equipo. Las posiciones se revelan a la vez.',
    });
    marco.querySelector('svg')?.remove();
    marco.prepend(svgPaisaje);
  }

  function dibujarFranja() {
    const items = [];
    if (v.temporizador) items.push(h('span', { class: 'reloj', 'data-fin': v.temporizador.fin, role: 'timer', 'aria-label': 'Tiempo restante' }, icono('reloj'), h('span', null, formatoReloj(v.temporizador.fin))));
    if (v.sala.fase === 'colocacion' && !v.revelacion) {
      items.push(h('span', { class: 'chip' }, icono('usuarios'), `${v.progreso.colocados} de ${v.progreso.total} listos`));
      items.push(h('span', { class: 'suave chico dato' }, icono('candado'), 'Nadie ve dónde se colocó cada uno hasta la revelación.'));
    } else if (v.revelada && v.distribucion) {
      const nc = nombreClima(v.distribucion);
      items.push(h('span', { class: 'chip clima' }, icono(nc === 'Tormentoso' || nc === 'Nublado' ? 'nube' : nc === 'Variable' ? 'hojas' : 'sol'), `Clima del equipo: ${nc.toLowerCase()}`));
      items.push(h('span', { class: 'chico' }, resumenDistribucion(v.distribucion)));
      if (v.razones) Object.entries(v.razones).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => items.push(h('span', { class: 'chip gris' }, `${RAZONES[k]} ${n}`)));
    }
    montar(franja, items);
  }

  function dibujarVelo() {
    const contando = v.revelacion && Date.now() < v.revelacion.en;
    velo.classList.toggle('oculto', !contando);
    if (contando) {
      const n = Math.max(1, Math.ceil((v.revelacion.en - Date.now()) / 1000));
      if (velo.dataset.n !== String(n)) {
        velo.dataset.n = String(n);
        montar(velo, h('div', null, h('div', { class: 'cuenta' }, n), h('p', null, 'Revelando el paisaje del equipo')));
      }
    }
  }

  function render(forzar = false) {
    if (!v) return;
    dibujarCabecera();
    dibujarPasos();
    dibujarPaisaje();
    dibujarFranja();
    dibujarVelo();
    escenario.classList.toggle('ancho', v.rol === 'facilitador' && ['analisis', 'cierre'].includes(v.sala.fase));
    const firma = JSON.stringify([{ ...v, temporizador: !!v.temporizador, eco: null, ecoUltimo: null }, local, perfil().dictado]);
    if (forzar || firma !== firmaPanel) {
      firmaPanel = firma;
      renderConservando(panel, () => [
        h('button', { type: 'button', class: 'ayuda-btn', 'aria-expanded': String(!!local.ayuda), 'aria-controls': 'ayuda-fase', onclick: () => { local.ayuda = !local.ayuda; render(true); } }, '¿Qué hago aquí?'),
        local.ayuda ? h('p', { class: 'nota', id: 'ayuda-fase' }, AYUDA[v.rol === 'facilitador' ? 'facilitador' : 'miembro'][v.sala.fase]) : null,
        v.rol === 'facilitador' ? panelFacilitador(ctx) : panelMiembro(ctx),
      ]);
      direccionSala().then(d => panel.querySelectorAll('.direccion').forEach(el => { el.textContent = d; }));
    }
    eco?.actualizar(v);
  }

  const desconectar = conectarSala(codigo, cred.token, {
    alEstado: nuevo => {
      const anterior = v;
      v = nuevo;
      if (reveladaAntes === null) reveladaAntes = v.revelada || !!v.revelacion;
      else if (!anterior?.revelacion && v.revelacion) reveladaAntes = false;
      if (anterior && anterior.sala.fase !== v.sala.fase) {
        anunciar(`Nueva fase: ${v.sala.faseNombre}`);
        local.cambiando = false;
        if (v.sala.fase === 'votacion') local.votos = null;
      }
      if (anterior && !anterior.revelada && v.revelada) anunciar(`Paisaje revelado. ${resumenDistribucion(v.distribucion)}${v.yo?.zona ? ` Tú estás en ${ZONAS[v.yo.zona].con}.` : ''}`);
      if (v.rol === 'facilitador' && !eco) eco = montarEco(app, ctx);
      render();
    },
    alCaer: () => conexion.classList.remove('oculto'),
    alVolver: () => conexion.classList.add('oculto'),
    alRechazo: err => {
      montar(app, h('main', { id: 'principal', class: 'pagina', style: { maxWidth: '520px', paddingTop: '12vh' } },
        h('div', { class: 'tarjeta' }, h('h1', null, 'No se pudo entrar a la sala'), h('p', null, err.message), h('a', { class: 'btn primario', href: '#/' }, 'Volver al inicio'))));
    },
  });

  const reloj = setInterval(() => {
    if (!v) return;
    document.querySelectorAll('.reloj[data-fin]').forEach(el => {
      el.lastElementChild.textContent = formatoReloj(Number(el.dataset.fin));
      el.classList.toggle('urgente', Number(el.dataset.fin) - Date.now() < 30000);
    });
    dibujarVelo();
  }, 250);

  const alCambiarPantalla = () => render();
  pantallaChica.addEventListener('change', alCambiarPantalla);

  return () => { pantallaChica.removeEventListener('change', alCambiarPantalla); desconectar(); clearInterval(reloj); eco?.desmontar(); ctx.compositor.detener(); };
}

export { plural };
