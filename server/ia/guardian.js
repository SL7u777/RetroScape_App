import { pedirJSON } from './gateway.js';

export const EMOCIONES = ['satisfacción', 'orgullo', 'alivio', 'cansancio', 'frustración', 'preocupación', 'enojo', 'confusión', 'neutral'];
const TIPOS = ['identifica_autor', 'señala_persona', 'datos_sensibles'];

const SISTEMA = `Eres el guardián del anonimato de RetroScape, una app de retrospectivas ágiles en la que los comentarios se publican sin autor y no se pueden retirar. Revisas un comentario ANTES de que se publique para detectar riesgos que quien lo escribe quizá no ve. No censuras ni juzgas la opinión: señalas el riesgo y propones una versión que conserve el problema de fondo.

Riesgos que debes detectar:
1. identifica_autor: datos que delatan a quien escribe. Su propio nombre, un rol que en el equipo solo tiene una persona ("como el único de QA"), o detalles que solo esa persona conoce ("me quedé tres noches con el bug de pagos").
2. señala_persona: un compañero nombrado o reconocible asociado a una culpa. La retrospectiva habla de procesos, no de personas. Nombrar a alguien para reconocerlo o agradecerle NO es un riesgo.
3. datos_sensibles: salud, vida personal u otros datos que no deberían quedar en un registro del equipo.

Si no hay un riesgo real, no inventes uno. Un comentario crítico o duro no es un riesgo por sí mismo. Cada riesgo debe citar un fragmento literal del comentario; si no puedes citar uno, no hay riesgo.

La sugerencia reescribe el comentario de forma impersonal o en plural ("se subió código sin pruebas", "nos faltó..."), conserva el problema y quita solo lo riesgoso. Si no hay riesgos, la sugerencia va vacía.

Además, indica la emoción principal del comentario, una de: ${EMOCIONES.join(', ')}.

Responde solo con este JSON:
{"riesgos":[{"tipo":"identifica_autor|señala_persona|datos_sensibles","fragmento":"texto exacto tomado del comentario","explicacion":"una frase breve, sin regañar"}],"sugerencia":"","emocion":""}`;

const normalizar = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Capa de reglas: lo que se resuelve sin IA (nombres exactos del equipo)
export function revisarConReglas(texto, nombres, propio = '') {
  const riesgos = [];
  const base = normalizar(texto);
  for (const parte of normalizar(propio).split(/\s+/).filter(p => p.length >= 3)) {
    const m = new RegExp(`\\b${parte}\\b`).exec(base);
    if (m) { riesgos.push({ tipo: 'identifica_autor', fragmento: texto.substr(m.index, parte.length), explicacion: 'Incluye tu nombre, así que el comentario dejaría de ser anónimo.', origen: 'reglas' }); break; }
  }
  for (const nombre of nombres) {
    const pila = normalizar(nombre).split(/\s+/).filter(p => p.length >= 3);
    for (const parte of pila) {
      const m = new RegExp(`\\b${parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).exec(base);
      if (m) {
        riesgos.push({ tipo: 'señala_persona', fragmento: texto.substr(m.index, parte.length), explicacion: `Menciona a ${nombre}, que es parte del equipo.`, origen: 'reglas' });
        break;
      }
    }
  }
  const delata = /\b(yo,?\s+soy|soy (el|la) unic[oa]|como (el|la) unic[oa])\b/.exec(base);
  if (delata) riesgos.push({ tipo: 'identifica_autor', fragmento: texto.substr(delata.index, delata[0].length), explicacion: 'Esta frase puede delatar quién lo escribió.', origen: 'reglas' });
  return riesgos;
}

function validar(texto) {
  const base = normalizar(texto);
  return r => {
    const riesgos = (Array.isArray(r.riesgos) ? r.riesgos : [])
      .filter(x => x && TIPOS.includes(x.tipo) && typeof x.explicacion === 'string')
      .map(x => {
        const frag = typeof x.fragmento === 'string' ? x.fragmento.trim() : '';
        return { tipo: x.tipo, fragmento: frag && base.includes(normalizar(frag)) ? frag : '', explicacion: x.explicacion.slice(0, 220), origen: 'ia' };
      })
      .filter(x => x.fragmento)
      .slice(0, 4);
    const sugerencia = riesgos.length && typeof r.sugerencia === 'string' ? r.sugerencia.trim().slice(0, 800) : '';
    const emocion = EMOCIONES.includes(r.emocion) ? r.emocion : 'neutral';
    return { riesgos, sugerencia, emocion };
  };
}

// El nombre de quien escribe se revisa solo con reglas: nunca viaja a la IA junto con su texto
export async function revisar(texto, nombres, propio) {
  const reglas = revisarConReglas(texto, nombres, propio);
  const usuario = `Lista de referencia con los integrantes del equipo, solo para reconocer nombres (NO es parte del comentario y no cuenta como riesgo): ${nombres.join(', ') || 'no informados'}\n\nComentario a revisar (el único texto que se evalúa):\n"""${texto}"""`;
  try {
    const { datos } = await pedirJSON('guardian', { texto, nombres }, { sistema: SISTEMA, usuario }, validar(texto));
    const cubiertos = datos.riesgos.map(r => normalizar(r.fragmento)).filter(Boolean);
    const extra = reglas.filter(r => !cubiertos.some(f => f.includes(normalizar(r.fragmento))));
    return { ...datos, riesgos: [...extra, ...datos.riesgos], revision: 'completa' };
  } catch {
    return { riesgos: reglas, sugerencia: '', emocion: null, revision: 'basica' };
  }
}
