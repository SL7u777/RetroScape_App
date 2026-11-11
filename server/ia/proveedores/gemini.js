import { config } from '../../config.js';

export const nombre = 'Gemini';
export const modelo = () => config.gemini.modelo;

export async function completar({ sistema, usuario, signal }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.gemini.modelo)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.gemini.key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: 'user', parts: [{ text: usuario }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}: ${json.error?.message || 'sin detalle'}`);
  const partes = json.candidates?.[0]?.content?.parts || [];
  const texto = partes.filter(p => !p.thought).map(p => p.text || '').join('');
  if (!texto) throw new Error('Gemini no devolvió texto');
  return texto;
}
