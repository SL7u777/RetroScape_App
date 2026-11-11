import { pedirJSON } from './gateway.js';

const SISTEMA = `Eres el analista de RetroScape. Recibes los comentarios anónimos de una retrospectiva ágil y preparas un BORRADOR para el facilitador, que lo revisará y corregirá antes de mostrarlo al equipo.

1. Agrupa los comentarios por el problema o logro de fondo que comparten, aunque usen palabras distintas. Cada comentario va en un solo tema, el que mejor refleja lo que dice. Máximo 5 temas. No crees temas que ningún comentario sustente; si un comentario no encaja con ningún otro, puede quedar en un tema propio.
2. Nombra cada tema en 2 a 5 palabras, describiendo el proceso o la situación, nunca a personas.
3. Propón de 1 a 2 acciones por tema, máximo 6 en total. Cada acción empieza con un verbo en infinitivo, es concreta, depende del propio equipo y se puede verificar al final del próximo sprint. Nada que culpe a alguien.

No copies frases de los comentarios que puedan identificar a su autor.

Responde solo con este JSON:
{"temas":[{"nombre":"","resumen":"una frase","comentarios":["c1","c2"]}],"acciones":[{"texto":"","tema":"nombre exacto de uno de tus temas","porque":"una frase que la conecta con lo que dijo el equipo"}]}`;

function validar(ids) {
  return r => {
    const usados = new Set();
    const temas = (Array.isArray(r.temas) ? r.temas : [])
      .filter(t => t && typeof t.nombre === 'string' && t.nombre.trim())
      .map(t => {
        const comentarios = (Array.isArray(t.comentarios) ? t.comentarios : []).map(String).filter(id => ids.has(id) && !usados.has(id));
        comentarios.forEach(id => usados.add(id));
        return { nombre: t.nombre.trim().slice(0, 60), resumen: String(t.resumen || '').trim().slice(0, 240), comentarios };
      })
      .filter(t => t.comentarios.length)
      .slice(0, 5);
    if (!temas.length) throw new Error('El análisis no agrupó ningún comentario');
    const nombres = new Map(temas.map(t => [t.nombre.toLowerCase(), t.nombre]));
    const acciones = (Array.isArray(r.acciones) ? r.acciones : [])
      .filter(a => a && typeof a.texto === 'string' && a.texto.trim())
      .map(a => ({ texto: a.texto.trim().slice(0, 160), tema: nombres.get(String(a.tema || '').toLowerCase()) || null, porque: String(a.porque || '').trim().slice(0, 240) }))
      .slice(0, 6);
    return { temas, acciones };
  };
}

export async function analizar({ equipo, sprint, distribucion, razones, comentarios }) {
  const clima = Object.entries(distribucion).map(([z, n]) => `${n} en ${z}`).join(', ');
  const motivos = Object.entries(razones).map(([k, n]) => `${k} ${n}`).join(', ') || 'ninguna';
  const usuario = `Sprint ${sprint} del ${equipo}. Clima del equipo: ${clima}. Razones marcadas: ${motivos}.\n\nComentarios:\n${comentarios.map(c => `${c.id}: ${c.texto}`).join('\n')}`;
  const ids = new Set(comentarios.map(c => c.id));
  return pedirJSON('analisis', { comentarios }, { sistema: SISTEMA, usuario }, validar(ids));
}
