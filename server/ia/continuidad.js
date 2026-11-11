import { pedirJSON } from './gateway.js';

const ESTADOS = ['persiste', 'mejora', 'sin_evidencia'];

const SISTEMA = `Eres la memoria del equipo en RetroScape. Al final de cada retrospectiva el equipo adopta misiones para el siguiente sprint, pero rara vez se revisa si funcionaron. Tu trabajo es cerrar ese ciclo comparando lo que el equipo dice HOY con lo que se acordó antes.

1. Para cada misión del sprint anterior decide su estado, usando solo los comentarios de hoy como evidencia:
   - persiste: los comentarios muestran que el problema que la misión debía resolver sigue ocurriendo.
   - mejora: los comentarios muestran que ese problema mejoró o ya no ocurre.
   - sin_evidencia: ningún comentario habla de ese problema. No es un fracaso; solo falta información.
   Cita en "evidencia" los ids de los comentarios que lo muestran. Si la misión persiste, propone en "ajuste" una acción reformulada que ataque la causa por la que la misión anterior no funcionó (verbo en infinitivo, concreta, verificable en un sprint). Si no persiste, deja "ajuste" vacío.
2. Para cada tema de hoy, indica si es el mismo problema que alguno de los temas históricos, aunque esté redactado distinto. Solo une temas que sean realmente el mismo problema.

No juzgues a personas ni supongas causas que los comentarios no mencionan.

Responde solo con este JSON:
{"seguimiento":[{"mision":"m1","estado":"persiste|mejora|sin_evidencia","evidencia":["c1"],"explicacion":"una frase","ajuste":""}],"recurrencias":[{"tema":"t1","tema_previo":"nombre exacto de un tema histórico"}]}`;

function validar({ misiones, temas, historicos, comentarios }) {
  const idsM = new Set(misiones.map(m => m.id));
  const idsT = new Set(temas.map(t => t.id));
  const idsC = new Set(comentarios.map(c => c.id));
  const previos = new Map(historicos.map(h => [h.nombre.toLowerCase(), h.nombre]));
  return r => {
    const vistos = new Set();
    const seguimiento = (Array.isArray(r.seguimiento) ? r.seguimiento : [])
      .filter(s => s && idsM.has(String(s.mision)) && !vistos.has(String(s.mision)) && vistos.add(String(s.mision)))
      .map(s => {
        const evidencia = (Array.isArray(s.evidencia) ? s.evidencia : []).map(String).filter(id => idsC.has(id));
        let estado = ESTADOS.includes(s.estado) ? s.estado : 'sin_evidencia';
        if (estado !== 'sin_evidencia' && !evidencia.length) estado = 'sin_evidencia';
        return {
          mision: String(s.mision),
          estado,
          evidencia: estado === 'sin_evidencia' ? [] : evidencia,
          explicacion: String(s.explicacion || '').trim().slice(0, 240),
          ajuste: estado === 'persiste' ? String(s.ajuste || '').trim().slice(0, 160) : '',
        };
      });
    for (const m of misiones) {
      if (!vistos.has(m.id)) seguimiento.push({ mision: m.id, estado: 'sin_evidencia', evidencia: [], explicacion: '', ajuste: '' });
    }
    const recurrencias = (Array.isArray(r.recurrencias) ? r.recurrencias : [])
      .filter(x => x && idsT.has(String(x.tema)) && previos.has(String(x.tema_previo || '').toLowerCase()))
      .map(x => ({ tema: String(x.tema), temaPrevio: previos.get(String(x.tema_previo).toLowerCase()) }));
    return { seguimiento, recurrencias };
  };
}

export async function revisarContinuidad({ misiones, temas, historicos, comentarios }) {
  if (!misiones.length && !historicos.length) return { datos: { seguimiento: [], recurrencias: [] }, proveedor: null };
  const usuario = [
    'Misiones del sprint anterior:',
    misiones.map(m => `${m.id}: ${m.texto}${m.criterio ? ` (se sabría cumplida si: ${m.criterio})` : ''}`).join('\n') || 'ninguna',
    '',
    'Temas históricos del equipo:',
    historicos.map(h => `- ${h.nombre} (sprints ${h.sprints.join(', ')})`).join('\n') || 'ninguno',
    '',
    'Temas de hoy:',
    temas.map(t => `${t.id}: ${t.nombre}. ${t.resumen}`).join('\n'),
    '',
    'Comentarios de hoy:',
    comentarios.map(c => `${c.id}: ${c.texto}`).join('\n'),
  ].join('\n');
  const entrada = { misiones, temas, historicos, comentarios };
  return pedirJSON('continuidad', entrada, { sistema: SISTEMA, usuario }, validar(entrada));
}
