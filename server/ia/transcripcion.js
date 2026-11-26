import { config } from '../config.js';

// Frases que Whisper inventa cuando el audio es casi silencio
const ALUCINACIONES = [/subt[ií]tulos? (realizados|por)/i, /amara\.org/i, /gracias por ver/i, /suscr[ií]bete/i, /^\s*(gracias|ok|eh)[.!]?\s*$/i];

export const hayTranscripcion = () => !!config.transcripcion.key;

export class ErrorTranscripcion extends Error {}

export async function transcribir(audio, tipo) {
  if (!hayTranscripcion()) throw new ErrorTranscripcion('La transcripción por voz no está configurada en el servidor.');
  const ext = /mp4|m4a|aac/.test(tipo) ? 'm4a' : /ogg/.test(tipo) ? 'ogg' : /wav/.test(tipo) ? 'wav' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([audio], { type: tipo }), `voz.${ext}`);
  form.append('model', config.transcripcion.modelo);
  form.append('language', 'es');
  form.append('temperature', '0');
  form.append('response_format', 'json');
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(config.transcripcion.url, { method: 'POST', body: form, signal: ctrl.signal, headers: { Authorization: `Bearer ${config.transcripcion.key}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[voz]', res.status, json.error?.message || '');
      throw new ErrorTranscripcion(res.status === 429 ? 'Se alcanzó el límite de transcripciones. Espera un momento o escribe.' : 'No se pudo transcribir el audio. Repite o escribe.');
    }
    const texto = String(json.text || '').replace(/\s+/g, ' ').trim();
    return ALUCINACIONES.some(r => r.test(texto)) ? '' : texto;
  } catch (e) {
    if (e instanceof ErrorTranscripcion) throw e;
    console.error('[voz]', e.message);
    throw new ErrorTranscripcion(e.name === 'AbortError' ? 'La transcripción tardó demasiado. Repite o escribe.' : 'No hay conexión con el servicio de transcripción.');
  } finally {
    clearTimeout(reloj);
  }
}
