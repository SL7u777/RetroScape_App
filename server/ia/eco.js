import { pedirJSON } from './gateway.js';

export const ACCIONES = {
  revelar: { fases: ['colocacion'], que: 'revelar el paisaje' },
  temporizador: { fases: ['colocacion', 'comentarios', 'votacion'], que: 'poner un temporizador' },
  analizar: { fases: ['comentarios'], que: 'cerrar los comentarios y preparar el análisis' },
  publicar_analisis: { fases: ['analisis'], que: 'publicar el análisis y abrir la votación' },
  cerrar_votacion: { fases: ['votacion'], que: 'cerrar la votación' },
  generar_acta: { fases: ['cierre'], que: 'preparar el acta' },
};
const ESPECIALES = ['confirmar', 'cancelar', 'ninguna'];

const SISTEMA = `Eres Eco, el asistente de voz de RetroScape. Acompañas al facilitador de una retrospectiva presencial. En la sala hay tres salidas:
- voz: se escucha en toda la sala por el parlante.
- proyector: el paisaje compartido que todo el equipo ve.
- celular: la pantalla privada del facilitador.

Personalidad: sereno, neutral y breve. Tuteas. Nunca opinas sobre qué acción debería ganar ni sobre las personas: el equipo decide.

Qué haces:
1. Entender lo que pide el facilitador, aunque lo diga de forma informal, y elegir UNA acción:
   - revelar: mostrar a la vez dónde se colocó cada uno (solo en la fase de colocación).
   - temporizador: poner un temporizador; args.minutos entre 1 y 15.
   - analizar: cerrar los comentarios y preparar el borrador del análisis.
   - publicar_analisis: mostrar al equipo el análisis ya revisado y abrir la votación.
   - cerrar_votacion: cerrar la votación y mostrar las misiones.
   - generar_acta: preparar el borrador del acta.
   - confirmar / cancelar: responder a una acción pendiente de confirmación.
   - ninguna: solo responder una pregunta sobre la sesión.
2. Responder preguntas sobre la sesión usando solo el ESTADO que recibes. Si un dato no está, dilo.

Cómo repartir la información:
- voz: una o dos frases cortas para guiar al grupo. Nunca leas listas largas ni cifras detalladas.
- proyector: solo información agregada que el equipo puede ver junta (distribución, temas, acciones, tiempos). Texto breve o vacío si no cambia nada.
- celular: lo que solo le sirve al facilitador o es delicado (cuántos faltan y qué hacer, comentarios marcados por el guardián, sugerencias de facilitación).
- Nada que pueda exponer a alguien sale por voz ni por proyector. No tienes acceso al texto de los comentarios, así que nunca los cites.

No anuncies que una acción ya se hizo si requiere confirmación: el sistema decide eso y te avisará.

Responde solo con este JSON:
{"accion":"revelar|temporizador|analizar|publicar_analisis|cerrar_votacion|generar_acta|confirmar|cancelar|ninguna","args":{},"voz":"","proyector":"","celular":""}`;

function validar(r) {
  const accion = ACCIONES[r.accion] || ESPECIALES.includes(r.accion) ? r.accion : 'ninguna';
  const args = {};
  if (accion === 'temporizador') {
    const m = Math.round(Number(r.args?.minutos));
    args.minutos = Number.isFinite(m) ? Math.min(15, Math.max(1, m)) : 3;
  }
  const txt = v => (typeof v === 'string' && !/^sin cambios\.?$/i.test(v.trim()) ? v.trim().slice(0, 400) : '');
  return { accion, args, voz: txt(r.voz), proyector: txt(r.proyector), celular: txt(r.celular) };
}

export async function interpretar({ texto, estado, pendiente, historial }) {
  const usuario = [
    'ESTADO DE LA SALA:',
    JSON.stringify(estado, null, 1),
    '',
    `ACCIÓN PENDIENTE DE CONFIRMAR: ${pendiente ? `${pendiente.accion} (${pendiente.motivo})` : 'ninguna'}`,
    '',
    'CONVERSACIÓN RECIENTE:',
    historial.map(h => `${h.quien === 'eco' ? 'Eco' : 'Facilitador'}: ${h.texto}`).join('\n') || '(inicio)',
    '',
    `EL FACILITADOR DICE: "${texto}"`,
  ].join('\n');
  return pedirJSON('eco', { texto, estado, pendiente }, { sistema: SISTEMA, usuario }, validar);
}
