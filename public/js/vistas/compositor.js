import { h, montar, aviso, anunciar } from '../ui.js';
import { pedir } from '../api.js';
import { dictar, hayDictado, mensajeErrorVoz } from '../voz.js';
import { perfil, guardarPerfil, registrarEmocion } from '../perfil.js';
import { icono } from '../iconos.js';
import { EMOCIONES } from './emociones.js';

const MARCA = { identifica_autor: 'Te puede identificar', señala_persona: 'Señala a una persona', datos_sensibles: 'Dato sensible' };

function distancia(a, b) {
  if (!a) return 0;
  const x = a.toLowerCase().split(/\s+/), y = new Set(b.toLowerCase().split(/\s+/));
  return x.filter(p => !y.has(p)).length / Math.max(1, x.length);
}

function resaltar(texto, fragmentos) {
  const frags = fragmentos.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!frags.length) return [texto];
  const re = new RegExp(`(${frags.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return texto.split(re).map(p => (frags.some(f => f.toLowerCase() === p.toLowerCase()) ? h('mark', null, p) : p));
}

export function crearCompositor(ctx) {
  const el = h('div', { class: 'compositor' });
  const area = h('textarea', { class: 'input', 'data-k': 'comentario', id: 'comentario', maxlength: 1000, placeholder: 'Qué pasó en este sprint. Habla de procesos, no de personas.', 'aria-label': 'Tu comentario anónimo' });
  const estadoVoz = h('span', { class: 'estado-voz', role: 'status' });
  let paso = 'escribir';
  let revision = null;
  let dictado = '';
  let detenerDictado = null;
  let emocion = null;
  let errorVoz = '';

  const mic = h('button', { type: 'button', class: 'mic', 'aria-label': 'Dictar comentario', onclick: () => (detenerDictado ? detenerDictado() : escuchar()) }, icono('mic'));

  function escuchar() {
    errorVoz = '';
    const base = area.value.trim();
    mic.classList.add('escuchando');
    mic.setAttribute('aria-label', 'Detener dictado');
    mic.replaceChildren(icono('alto'));
    estadoVoz.textContent = 'Grabando. Habla con normalidad.';
    detenerDictado = dictar({
      espera: perfil().dictado.espera,
      alParcial: t => { area.value = [base, t].filter(Boolean).join(' '); estadoVoz.textContent = 'Grabando…'; },
      alFinal: t => { fin(); if (t) { dictado = area.value; estadoVoz.textContent = 'Listo. Revisa el texto antes de publicar.'; } else estadoVoz.textContent = 'No se escuchó nada.'; },
      alError: (codigo, parcial) => { fin(); if (parcial) area.value = [base, parcial].filter(Boolean).join(' '); errorVoz = mensajeErrorVoz(codigo); estadoVoz.textContent = ''; dibujar(); },
    });
  }
  function fin() {
    detenerDictado = null;
    mic.classList.remove('escuchando');
    mic.setAttribute('aria-label', 'Dictar comentario');
    mic.replaceChildren(icono('mic'));
  }

  async function revisar() {
    const texto = area.value.trim();
    if (texto.length < 3) { aviso('Escribe o dicta tu comentario primero', 'error'); area.focus(); return; }
    detenerDictado?.();
    if (dictado && distancia(dictado, texto) > 0.15) {
      const d = perfil().dictado;
      guardarPerfil({ dictado: { ...d, correcciones: d.correcciones + 1 } });
    }
    paso = 'revisando';
    dibujar();
    try {
      revision = await pedir(`/api/salas/${ctx.codigo}/guardian`, { token: ctx.token, texto });
      paso = 'previa';
    } catch (e) {
      aviso(e.message, 'error');
      paso = 'escribir';
    }
    dibujar();
    el.querySelector('.previa')?.focus();
  }

  async function publicar(marcado = null) {
    const texto = area.value.trim();
    paso = 'enviando';
    dibujar();
    const ok = await ctx.accion('comentar', { texto, marcado });
    if (!ok) { paso = 'previa'; dibujar(); return; }
    ctx.local.enviados.push(texto);
    emocion = revision?.emocion && revision.emocion !== 'neutral' ? revision.emocion : null;
    area.value = '';
    dictado = '';
    revision = null;
    paso = emocion ? 'emocion' : 'escribir';
    anunciar('Comentario publicado de forma anónima');
    aviso('Publicado de forma anónima');
    dibujar();
    ctx.refrescar();
  }

  function sugerenciaPersonal() {
    const d = perfil().dictado;
    if (d.correcciones < 3 || d.sugerenciaVista || !hayDictado) return null;
    const cerrar = cambios => { guardarPerfil({ dictado: { ...d, ...cambios, sugerenciaVista: true } }); dibujar(); };
    return h('div', { class: 'nota' },
      h('p', null, 'Sueles corregir lo que dictas. ¿Te damos más tiempo para hablar antes de cortar la grabación?'),
      h('div', { class: 'fila', style: { marginTop: '8px' } },
        h('button', { type: 'button', class: 'btn chico', onclick: () => cerrar({ espera: 3200 }) }, 'Sí, esperar más'),
        h('button', { type: 'button', class: 'btn chico', onclick: () => { cerrar({}); area.focus(); } }, 'Prefiero escribir'),
        h('button', { type: 'button', class: 'btn texto chico', onclick: () => cerrar({}) }, 'No, así está bien')));
  }

  function dibujar() {
    if (paso === 'escribir' || paso === 'revisando') {
      const ocupado = paso === 'revisando';
      montar(el,
        area,
        h('div', { class: 'barra' },
          hayDictado ? mic : null,
          h('div', { style: { flex: 1 } }, estadoVoz),
          h('button', { type: 'button', class: 'btn primario', disabled: ocupado, onclick: revisar }, ocupado ? 'Revisando…' : 'Revisar y publicar')),
        errorVoz ? h('div', { class: 'nota error', role: 'alert' }, h('p', null, errorVoz), h('div', { class: 'fila', style: { marginTop: '8px' } },
          hayDictado ? h('button', { type: 'button', class: 'btn chico', onclick: escuchar }, icono('repetir'), 'Repetir') : null,
          h('button', { type: 'button', class: 'btn chico', onclick: () => { errorVoz = ''; dibujar(); area.focus(); } }, icono('editar'), 'Escribir'))) : null,
        sugerenciaPersonal(),
        h('p', { class: 'suave chico dato' }, icono('candado'), 'Antes de publicar, la IA revisa si algo te podría identificar o señala a alguien.'));
      return;
    }
    if (paso === 'previa' || paso === 'enviando') {
      const riesgos = revision?.riesgos || [];
      const enviando = paso === 'enviando';
      const texto = area.value.trim();
      montar(el, h('div', { class: 'previa', tabindex: -1, 'aria-label': 'Vista previa del comentario' },
        h('span', { class: 'chico suave' }, 'Así se publicará, sin tu nombre:'),
        h('blockquote', null, riesgos.length ? resaltar(texto, riesgos.map(r => r.fragmento)) : texto),
        riesgos.length ? h('div', { class: 'pila g8', role: 'alert' },
          h('strong', null, riesgos.length === 1 ? 'Antes de publicar, revisa esto:' : 'Antes de publicar, revisa estas partes:'),
          riesgos.map(r => h('div', { class: 'riesgo' }, h('span', { class: 'chip error', style: { alignSelf: 'flex-start' } }, MARCA[r.tipo]), h('span', null, r.explicacion))),
          revision.sugerencia ? h('div', { class: 'sugerencia' },
            h('span', { class: 'chico' }, 'Una versión que conserva el problema:'),
            h('p', null, revision.sugerencia),
            h('button', { type: 'button', class: 'btn chico', disabled: enviando, onclick: () => { area.value = revision.sugerencia; revision = { ...revision, riesgos: [], sugerencia: '' }; dibujar(); } }, icono('check'), 'Usar esta versión')) : null) : null,
        revision?.revision === 'basica' ? h('p', { class: 'chico suave' }, 'La revisión con IA no respondió; solo se buscaron nombres del equipo.') : null,
        h('p', { class: 'chico' }, 'Un comentario publicado no se puede editar ni retirar.'),
        h('div', { class: 'fila' },
          riesgos.length
            ? h('button', { type: 'button', class: 'btn', disabled: enviando, onclick: () => publicar(riesgos[0].tipo) }, 'Publicar igual')
            : h('button', { type: 'button', class: 'btn primario', disabled: enviando, onclick: () => publicar() }, icono('enviar'), enviando ? 'Publicando…' : 'Publicar'),
          h('button', { type: 'button', class: 'btn texto', disabled: enviando, onclick: () => { paso = 'escribir'; revision = null; dibujar(); area.focus(); } }, icono('editar'), 'Editar'))));
      return;
    }
    if (paso === 'emocion') {
      const cerrar = guardar => { if (guardar) registrarEmocion(guardar, ctx.v?.sala.sprint); emocion = null; paso = 'escribir'; dibujar(); };
      montar(el, h('div', { class: 'nota teal pila g8', role: 'group', 'aria-label': 'Confirmar emoción' },
        h('p', null, `Tu comentario suena a ${emocion}. ¿Es así como te sentiste?`),
        h('p', { class: 'chico suave' }, 'Se guarda solo en tu perfil, en este dispositivo.'),
        h('div', { class: 'opciones' },
          h('button', { type: 'button', class: 'opcion', 'aria-pressed': 'true', onclick: () => cerrar(emocion) }, `Sí, ${emocion}`),
          EMOCIONES.filter(e => e !== emocion && e !== 'neutral').slice(0, 5).map(e => h('button', { type: 'button', class: 'opcion', onclick: () => cerrar(e) }, e)),
          h('button', { type: 'button', class: 'opcion', onclick: () => cerrar(null) }, 'Prefiero no decir'))));
    }
  }

  dibujar();
  return { el, detener: () => detenerDictado?.() };
}
