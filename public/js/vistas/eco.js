import { h, montar, aviso } from '../ui.js';
import { pedir } from '../api.js';
import { dictar, hayDictado, hablar, mensajeErrorVoz } from '../voz.js';
import { perfil, guardarPerfil } from '../perfil.js';
import { icono } from '../iconos.js';

const EJEMPLOS = ['¿Cuántos faltan?', 'Dales dos minutos más', 'Revela el paisaje', '¿De qué temas se habla?', 'Abre la votación'];

export function montarEco(app, ctx) {
  let abierto = false;
  let ocupado = false;
  let ultimoHablado = null;
  let detener = null;
  let v = ctx.v;

  const boton = h('button', { type: 'button', class: 'eco-boton', 'aria-expanded': 'false', 'aria-controls': 'eco-panel', onclick: () => alternar() },
    h('span', { class: 'orbe' }, icono('mic')), h('span', null, 'Eco'));
  const panel = h('section', { class: 'eco-panel oculto', id: 'eco-panel', role: 'dialog', 'aria-label': 'Eco, asistente de voz' });
  const log = h('div', { class: 'eco-log', 'aria-live': 'polite' });
  const entrada = h('input', { class: 'input', placeholder: 'Escribe o toca el micrófono', 'aria-label': 'Pídele algo a Eco', maxlength: 300 });
  const mic = h('button', { type: 'button', class: 'mic', 'aria-label': 'Hablar con Eco' }, icono('mic'));
  const pendiente = h('div', { class: 'pila g8' });
  const destino = h('select', { class: 'input', style: { minHeight: '36px', padding: '4px 8px' }, 'aria-label': 'Dónde suena la voz de Eco', onchange: e => guardarPerfil({ prefs: { ...perfil().prefs, vozEco: e.target.value } }) },
    h('option', { value: 'este' }, 'Voz en este dispositivo'), h('option', { value: 'proyector' }, 'Voz en el proyector'), h('option', { value: 'ninguno' }, 'Sin voz, solo texto'));
  destino.value = perfil().prefs.vozEco;

  montar(panel,
    h('div', { class: 'eco-cabeza' },
      h('div', null, h('h2', { class: 'eco-titulo' }, 'Eco'), h('p', { class: 'chico suave' }, 'Guía la retro con la voz. Lo delicado solo aparece aquí.')),
      h('button', { type: 'button', class: 'btn texto chico', 'aria-label': 'Cerrar Eco', onclick: () => alternar(false) }, icono('cerrar'))),
    log,
    h('footer', null, pendiente,
      h('form', { class: 'eco-entrada', onsubmit: e => { e.preventDefault(); enviar(entrada.value); } }, hayDictado ? mic : null, entrada, h('button', { type: 'submit', class: 'btn chico', 'aria-label': 'Enviar a Eco' }, icono('enviar'))),
      destino));
  app.append(panel);

  const vozEn = () => (destino.value === 'proyector' ? 'proyector' : 'facilitador');

  function alternar(forzar) {
    abierto = forzar ?? !abierto;
    panel.classList.toggle('oculto', !abierto);
    boton.setAttribute('aria-expanded', String(abierto));
    if (abierto) { dibujarLog(); entrada.focus(); }
  }

  function escuchar() {
    if (detener) { detener(); return; }
    mic.classList.add('escuchando');
    entrada.placeholder = 'Te escucho…';
    detener = dictar({
      espera: 2000,
      alParcial: t => { entrada.value = t; },
      alFinal: t => { fin(); if (t) enviar(t); },
      alError: c => { fin(); aviso(mensajeErrorVoz(c), 'error'); },
    });
  }
  function fin() { detener = null; mic.classList.remove('escuchando'); entrada.placeholder = 'Escribe o toca el micrófono'; }
  mic.addEventListener('click', escuchar);

  async function enviar(texto) {
    texto = String(texto || '').trim();
    if (!texto || ocupado) return;
    ocupado = true;
    entrada.value = '';
    dibujarLog(texto);
    try {
      await pedir(`/api/salas/${ctx.codigo}/eco`, { token: ctx.token, texto, vozEn: vozEn() });
    } catch (e) {
      aviso(e.message, 'error');
    }
    ocupado = false;
    dibujarLog();
  }

  function dibujarLog(enviando) {
    const items = (v?.eco?.log || []).map(m => m.quien === 'eco'
      ? h('div', { class: 'burbuja eco' }, m.texto, m.celular ? h('div', { class: 'privado' }, icono('candado'), h('span', null, h('span', { class: 'sr' }, 'Solo para ti: '), m.celular)) : null)
      : h('div', { class: 'burbuja yo' }, m.texto));
    if (enviando) items.push(h('div', { class: 'burbuja yo' }, enviando), h('div', { class: 'burbuja eco suave' }, 'Pensando…'));
    if (!items.length) {
      items.push(h('div', { class: 'pila g8' }, h('p', { class: 'chico suave' }, 'Prueba con:'),
        h('div', { class: 'opciones' }, EJEMPLOS.map(e => h('button', { type: 'button', class: 'opcion chico', onclick: () => enviar(e) }, e)))));
    }
    montar(log, items);
    log.scrollTop = log.scrollHeight;
  }

  function dibujarPendiente() {
    const p = v?.eco?.pendiente;
    if (!p) { pendiente.replaceChildren(); return; }
    montar(pendiente, h('div', { class: 'nota oro pila g8', role: 'alert' },
      h('p', null, p.motivo),
      h('div', { class: 'fila' },
        h('button', { type: 'button', class: 'btn chico primario', onclick: () => ctx.accion('ecoConfirmar', { vozEn: vozEn() }) }, 'Sí, hazlo'),
        h('button', { type: 'button', class: 'btn chico texto', onclick: () => ctx.accion('ecoCancelar', { vozEn: vozEn() }) }, 'No'))));
  }

  return {
    boton,
    actualizar(nuevo) {
      v = nuevo;
      const u = v.eco?.ultimo;
      if (u && ultimoHablado === null) ultimoHablado = u.id;
      if (u && u.id !== ultimoHablado) {
        ultimoHablado = u.id;
        if (u.vozEn !== 'proyector' && destino.value === 'este' && u.voz) hablar(u.voz);
      }
      if (abierto && !ocupado) dibujarLog();
      dibujarPendiente();
      if (v.eco?.pendiente && !abierto) alternar(true);
    },
    desmontar() { detener?.(); boton.remove(); panel.remove(); },
  };
}
