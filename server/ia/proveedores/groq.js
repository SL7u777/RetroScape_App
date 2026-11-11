import { config } from '../../config.js';

export const nombre = 'Groq';
export const modelo = () => config.groq.modelo;

export async function completar({ sistema, usuario, signal }) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groq.key}` },
    body: JSON.stringify({
      model: config.groq.modelo,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: usuario },
      ],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Groq respondió ${res.status}: ${json.error?.message || 'sin detalle'}`);
  const texto = json.choices?.[0]?.message?.content;
  if (!texto) throw new Error('Groq no devolvió texto');
  return texto;
}
