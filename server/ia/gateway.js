import { config } from '../config.js';
import * as gemini from './proveedores/gemini.js';
import * as groq from './proveedores/groq.js';
import * as simulado from './proveedores/simulado.js';

const ADAPTADORES = { gemini, groq };

export function infoIA() {
  const p = config.proveedor;
  if (p === 'simulado') {
    const motivo = config.proveedorPedido && config.proveedorPedido !== 'simulado'
      ? `No se encontró la clave de ${config.proveedorPedido}.`
      : 'No hay clave de Gemini ni de Groq configurada.';
    return { proveedor: 'simulado', nombre: 'IA simulada', modelo: 'reglas locales', simulado: true, motivo: config.proveedorPedido === 'simulado' ? 'Elegido en .env para pruebas.' : motivo };
  }
  return { proveedor: p, nombre: ADAPTADORES[p].nombre, modelo: ADAPTADORES[p].modelo(), simulado: false };
}

export class ErrorIA extends Error {}

function mensajeClaro(m) {
  const nombre = ADAPTADORES[config.proveedor]?.nombre || 'el proveedor';
  const clave = config.proveedor === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY';
  if (/\b(401|403)\b/.test(m)) return `La clave de ${nombre} no es válida. Revisa ${clave} en el archivo .env.`;
  if (/\b404\b/.test(m)) return `${nombre} no encontró el modelo configurado. Revisa el nombre del modelo en .env.`;
  if (/\b429\b/.test(m)) return `Se alcanzó el límite de uso de ${nombre}. Espera un momento y vuelve a intentarlo.`;
  if (/tard[oó] demasiado/.test(m)) return `${nombre} tardó demasiado en responder.`;
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(m)) return `No hay conexión con ${nombre}. Revisa el internet de la laptop.`;
  if (/JSON|formato|agrup/i.test(m)) return `${nombre} respondió en un formato inesperado.`;
  return `${nombre} no respondió correctamente.`;
}

function extraerJSON(texto) {
  const limpio = texto.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '').trim();
  const ini = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (ini < 0 || fin <= ini) throw new Error('La respuesta no contiene JSON');
  return JSON.parse(limpio.slice(ini, fin + 1));
}

export async function pedirJSON(tarea, entrada, prompts, validar) {
  if (config.proveedor === 'simulado') {
    return { datos: validar(simulado[tarea](entrada)), proveedor: 'simulado' };
  }
  const adaptador = ADAPTADORES[config.proveedor];
  let ultimoError;
  for (let intento = 0; intento < 2; intento++) {
    const ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), config.timeoutIA);
    try {
      const usuario = intento === 0 ? prompts.usuario : prompts.usuario + '\n\nTu respuesta anterior no era JSON válido con el formato pedido. Responde solo el objeto JSON.';
      const texto = await adaptador.completar({ sistema: prompts.sistema, usuario, signal: ctrl.signal });
      return { datos: validar(extraerJSON(texto)), proveedor: config.proveedor };
    } catch (e) {
      ultimoError = e.name === 'AbortError' ? new Error('El proveedor tardó demasiado en responder') : e;
      if (/\b(401|403|404)\b/.test(ultimoError.message)) break;
      if (/\b429\b/.test(ultimoError.message)) {
        const seg = Number(/try again in ([\d.]+)s/.exec(ultimoError.message)?.[1]) || 3;
        await new Promise(r => setTimeout(r, Math.min(seg + 0.5, 8) * 1000));
      }
    } finally {
      clearTimeout(reloj);
    }
  }
  console.error(`[IA:${tarea}]`, ultimoError.message);
  throw new ErrorIA(mensajeClaro(ultimoError.message));
}
