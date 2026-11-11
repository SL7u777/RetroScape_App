import { pedirJSON } from './gateway.js';

const SISTEMA = `Eres quien redacta el acta de una retrospectiva en RetroScape. El acta la leen el Product Owner y quienes no estuvieron, y el próximo sprint se usa para revisar si las misiones se cumplieron. El facilitador la revisará antes de publicarla.

Escribe en español claro, sin adornos y sin nombrar a nadie salvo a los responsables de las misiones. No inventes datos que no estén en la información recibida.

- resumen: 2 o 3 frases con lo esencial del sprint para alguien que no estuvo.
- clima: 1 o 2 frases que interpreten la distribución del paisaje (cima: bien, valle: regular, tormenta: difícil) y las razones marcadas, sin porcentajes.
- misiones: para cada misión adoptada, un criterio verificable que permita saber al final del próximo sprint si se cumplió ("como_sabremos").
- seguimiento: 1 o 2 frases sobre las misiones anteriores. Vacío si no hubo.
- proximos_pasos: de 1 a 3 pasos concretos para el inicio del próximo sprint.

Responde solo con este JSON:
{"resumen":"","clima":"","misiones":[{"texto":"","como_sabremos":""}],"seguimiento":"","proximos_pasos":[""]}`;

const lista = (v, n) => (Array.isArray(v) ? v : []).map(x => String(x || '').trim()).filter(Boolean).slice(0, n);

function validar(misiones) {
  return r => {
    if (typeof r.resumen !== 'string' || !r.resumen.trim()) throw new Error('El acta no trae resumen');
    const criterios = new Map((Array.isArray(r.misiones) ? r.misiones : []).map(m => [String(m?.texto || '').toLowerCase(), String(m?.como_sabremos || '').trim()]));
    return {
      resumen: r.resumen.trim().slice(0, 600),
      clima: String(r.clima || '').trim().slice(0, 400),
      criterios: misiones.map((m, i) => criterios.get(m.texto.toLowerCase()) || String(r.misiones?.[i]?.como_sabremos || '').trim()).map(c => c.slice(0, 200)),
      seguimiento: String(r.seguimiento || '').trim().slice(0, 400),
      proximos: lista(r.proximos_pasos, 3).map(p => p.slice(0, 200)),
    };
  };
}

export async function redactarActa(s) {
  const usuario = JSON.stringify({
    equipo: s.equipo,
    sprint: s.sprint,
    participantes: s.participantes,
    distribucion: s.distribucion,
    razones: s.razones,
    temas: s.temas.map(t => ({ nombre: t.nombre, resumen: t.resumen, comentarios: t.comentarios })),
    misiones_adoptadas: s.misiones.map(m => ({ texto: m.texto, fichas: m.fichas, responsable: m.responsable || 'sin asignar' })),
    ideas_congeladas: s.congeladas.map(c => c.texto),
    seguimiento_misiones_anteriores: s.seguimiento.map(x => ({ mision: x.texto, estado: x.estado, explicacion: x.explicacion })),
  }, null, 1);
  return pedirJSON('acta', s, { sistema: SISTEMA, usuario }, validar(s.misiones));
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const ZONA = { cima: 'Cima', valle: 'Valle', tormenta: 'Tormenta' };
const ESTADO = { persiste: 'sigue ocurriendo', mejora: 'mejoró', sin_evidencia: 'sin evidencia' };

export function actaEnTexto(s, r) {
  const L = [];
  L.push(`# Acta de retrospectiva: ${s.equipo}, sprint ${s.sprint}`, '');
  L.push(r.resumen, '');
  L.push('## Clima del equipo', '');
  L.push(`${Object.entries(s.distribucion).map(([z, n]) => `${ZONA[z]}: ${n}`).join(', ')} (${s.participantes} participantes).`);
  if (r.clima) L.push('', r.clima);
  L.push('', '## Temas', '');
  s.temas.forEach(t => L.push(`- **${t.nombre}** (${plural(t.comentarios, 'comentario', 'comentarios')}). ${t.resumen}`.trim()));
  L.push('', '## Misiones del próximo sprint', '');
  s.misiones.forEach((m, i) => {
    L.push(`- **${m.texto}** (${plural(m.fichas, 'ficha', 'fichas')})${m.responsable ? `. Responsable: ${m.responsable}` : ''}`);
    if (r.criterios[i]) L.push(`  Cómo sabremos que se cumplió: ${r.criterios[i]}`);
  });
  if (s.seguimiento.length) {
    L.push('', '## Seguimiento de las misiones anteriores', '');
    s.seguimiento.forEach(x => L.push(`- ${x.texto}: ${ESTADO[x.estado]}${x.explicacion ? `. ${x.explicacion}` : ''}`));
    if (r.seguimiento) L.push('', r.seguimiento);
  }
  if (s.congeladas.length) {
    L.push('', '## Ideas congeladas', '');
    s.congeladas.forEach(c => L.push(`- ${c.texto} (${c.fichas ? plural(c.fichas, 'ficha', 'fichas') : 'sin fichas'})`));
  }
  if (r.proximos.length) {
    L.push('', '## Próximos pasos', '');
    r.proximos.forEach(p => L.push(`- ${p}`));
  }
  return L.join('\n');
}
