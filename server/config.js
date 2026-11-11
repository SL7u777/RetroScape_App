import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const RAIZ = fileURLToPath(new URL('../', import.meta.url));

function cargarEnv() {
  const ruta = RAIZ + '.env';
  if (!existsSync(ruta)) return;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
cargarEnv();

const claveValida = v => v && !/^tu_|aqui|xxx/i.test(v);
const geminiKey = claveValida(process.env.GEMINI_API_KEY) ? process.env.GEMINI_API_KEY : '';
const groqKey = claveValida(process.env.GROQ_API_KEY) ? process.env.GROQ_API_KEY : '';

function elegirProveedor() {
  const pedido = (process.env.IA_PROVEEDOR || '').toLowerCase();
  if (pedido === 'simulado') return 'simulado';
  if (pedido === 'gemini' && geminiKey) return 'gemini';
  if (pedido === 'groq' && groqKey) return 'groq';
  if (!pedido) return geminiKey ? 'gemini' : groqKey ? 'groq' : 'simulado';
  return 'simulado';
}

export const config = {
  puerto: Number(process.env.PORT) || 5173,
  proveedor: elegirProveedor(),
  proveedorPedido: (process.env.IA_PROVEEDOR || '').toLowerCase(),
  gemini: { key: geminiKey, modelo: process.env.GEMINI_MODEL || 'gemini-3.8-flash' },
  groq: { key: groqKey, modelo: process.env.GROQ_MODEL || 'openai/gpt-oss-120b' },
  timeoutIA: Number(process.env.IA_TIMEOUT_MS) || 45000,
  archivoDatos: process.env.RETROSCAPE_DATOS || RAIZ + 'data/retroscape.json',
};
