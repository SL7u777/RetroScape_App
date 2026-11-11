export async function pedir(ruta, cuerpo) {
  let res;
  try {
    res = await fetch(ruta, cuerpo === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  } catch {
    throw Object.assign(new Error('Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.'), { status: 0 });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `Error ${res.status}`), { status: res.status });
  return json;
}

export function conectarSala(codigo, token, { alEstado, alCaer, alVolver, alRechazo }) {
  let es;
  let caido = false;
  let cerrado = false;
  const abrir = () => {
    es = new EventSource(`/api/salas/${encodeURIComponent(codigo)}/eventos?token=${encodeURIComponent(token)}`);
    es.addEventListener('estado', e => {
      if (caido) { caido = false; alVolver?.(); }
      alEstado(JSON.parse(e.data));
    });
    es.onerror = async () => {
      if (cerrado) return;
      if (!caido) { caido = true; alCaer?.(); }
      try {
        await pedir(`/api/salas/${encodeURIComponent(codigo)}/vista?token=${encodeURIComponent(token)}`);
      } catch (err) {
        if (err.status === 401 || err.status === 404) { es.close(); cerrado = true; alRechazo?.(err); }
      }
    };
  };
  abrir();
  return () => { cerrado = true; es?.close(); };
}

export const accion = (codigo, token, tipo, datos = {}) => pedir(`/api/salas/${encodeURIComponent(codigo)}/accion`, { token, tipo, ...datos });
