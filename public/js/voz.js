const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hayLectura = 'speechSynthesis' in window;
const idioma = navigator.language?.startsWith('es') ? navigator.language : 'es-PE';
const hayGrabacion = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder && window.isSecureContext);
const CLAVE_FALLO = 'retroscape.dictadoNavegador';

let servidor = false;
export const vozLista = fetch('/api/estado').then(r => r.json()).then(e => { servidor = !!e.ia?.transcripcion; }).catch(() => {});

const navegadorFalla = () => { try { return sessionStorage.getItem(CLAVE_FALLO) === 'falla'; } catch { return false; } };
const marcarFallo = () => { try { sessionStorage.setItem(CLAVE_FALLO, 'falla'); } catch { /* sin almacenamiento */ } };

// 'navegador' (Web Speech), 'servidor' (grabación + Whisper) o null si no hay forma de dictar
export function modoDictado() {
  if (Reconocimiento && !navegadorFalla()) return 'navegador';
  if (servidor && hayGrabacion) return 'servidor';
  return Reconocimiento ? 'navegador' : null;
}
export const puedeDictar = () => modoDictado() !== null;
export const motivoSinVoz = () => (!window.isSecureContext ? 'inseguro' : 'no-disponible');
// compatibilidad con vistas que solo preguntan si hay dictado
export const hayDictado = !!Reconocimiento;

export function dictar(op) {
  const modo = modoDictado();
  if (!modo) { op.alError?.(motivoSinVoz()); return () => {}; }
  if (modo === 'servidor') return grabar(op);
  let parar = dictarNavegador({
    ...op,
    alError: (codigo, parcial) => {
      if (['network', 'service-not-allowed', 'language-not-supported'].includes(codigo) && servidor && hayGrabacion && !parcial) {
        marcarFallo();
        op.alEstado?.('El dictado del navegador no responde. Grabando para transcribir en el servidor…');
        parar = grabar(op);
        return;
      }
      op.alError?.(codigo, parcial);
    },
  });
  return () => parar();
}

// Dictado del navegador; espera hasta `inicio` ms a que la persona empiece y se detiene tras un silencio de `espera` ms
function dictarNavegador({ alParcial, alFinal, alError, espera = 1800, inicio = 7000 }) {
  const r = new Reconocimiento();
  r.lang = idioma;
  r.continuous = true;
  r.interimResults = true;
  let texto = '';
  let silencio;
  let terminado = false;
  let pedido = false;
  let pendiente = '';
  let reinicios = 0;
  const parar = () => { pedido = true; try { r.stop(); } catch { /* ya terminó */ } };
  const reiniciarSilencio = (ms = espera) => { clearTimeout(silencio); silencio = setTimeout(parar, ms); };
  r.onresult = e => {
    let parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) texto += e.results[i][0].transcript + ' ';
      else parcial += e.results[i][0].transcript;
    }
    pendiente = parcial;
    alParcial?.((texto + parcial).trim());
    reiniciarSilencio();
  };
  r.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') { terminado = true; clearTimeout(silencio); alError?.(e.error, texto.trim()); } };
  // Chrome a veces cierra el reconocimiento por su cuenta: se retoma hasta que haya silencio de verdad
  r.onend = () => {
    if (pendiente) { texto += pendiente + ' '; pendiente = ''; }
    if (!pedido && !terminado && reinicios < 6) {
      reinicios++;
      try { r.start(); return; } catch { /* no se pudo retomar */ }
    }
    clearTimeout(silencio);
    if (!terminado) { terminado = true; alFinal?.(texto.trim()); }
  };
  try { r.start(); reiniciarSilencio(Math.max(inicio, espera)); } catch { alError?.('ocupado'); }
  return parar;
}

const TIPOS_AUDIO = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

// Graba con el micrófono, corta tras un silencio y transcribe en el servidor
function grabar({ alFinal, alError, alEstado, alNivel, espera = 1800, inicio = 7000, sala }) {
  let detenido = false;
  let parar = () => { detenido = true; };
  (async () => {
    let flujo;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      alError?.(e.name === 'NotAllowedError' ? 'not-allowed' : e.name === 'NotFoundError' ? 'audio-capture' : 'grabacion');
      return;
    }
    if (detenido) { flujo.getTracks().forEach(t => t.stop()); alFinal?.(''); return; }
    const tipo = TIPOS_AUDIO.find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
    const trozos = [];
    rec.ondataavailable = e => { if (e.data.size) trozos.push(e.data); };

    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const analizador = audio.createAnalyser();
    analizador.fftSize = 1024;
    audio.createMediaStreamSource(flujo).connect(analizador);
    const muestras = new Float32Array(analizador.fftSize);
    const t0 = Date.now();
    let piso = 1;
    let hablo = false;
    let ultimaVoz = 0;
    const reloj = setInterval(() => {
      analizador.getFloatTimeDomainData(muestras);
      const rms = Math.sqrt(muestras.reduce((a, x) => a + x * x, 0) / muestras.length);
      const ahora = Date.now();
      if (ahora - t0 < 600) piso = Math.min(piso, rms);
      const umbral = Math.max(0.012, Math.min(piso, 0.05) * 2.5);
      alNivel?.(Math.min(1, rms / (umbral * 3)));
      if (rms > umbral) { hablo = true; ultimaVoz = ahora; }
      if ((hablo && ahora - ultimaVoz > espera) || (!hablo && ahora - t0 > inicio) || ahora - t0 > 60000) parar();
    }, 100);

    parar = () => { if (rec.state !== 'inactive') rec.stop(); };
    rec.onstop = async () => {
      clearInterval(reloj);
      flujo.getTracks().forEach(t => t.stop());
      audio.close().catch(() => {});
      alNivel?.(0);
      if (!hablo || !trozos.length) { alFinal?.(''); return; }
      alEstado?.('Transcribiendo…');
      const blob = new Blob(trozos, { type: rec.mimeType || tipo || 'audio/webm' });
      try {
        const res = await fetch(`/api/salas/${encodeURIComponent(sala.codigo)}/transcribir?token=${encodeURIComponent(sala.token)}`, { method: 'POST', headers: { 'Content-Type': blob.type.split(';')[0] }, body: blob });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { alError?.('transcripcion', '', json.error); return; }
        alFinal?.(json.texto || '');
      } catch {
        alError?.('transcripcion', '', 'Sin conexión con el servidor para transcribir. Escribe o vuelve a intentarlo.');
      }
    };
    rec.start(250);
    alEstado?.('Grabando. Habla con normalidad.');
  })();
  return () => parar();
}

export const mensajeErrorVoz = (codigo, detalle, alternativa = 'escribe tu comentario') => ({
  'not-allowed': `El navegador no dio permiso al micrófono. Actívalo en el candado de la barra de direcciones o ${alternativa}.`,
  'service-not-allowed': `Este navegador no permite dictar aquí. Prueba con Chrome o ${alternativa}.`,
  'no-disponible': `Este navegador no permite dictar. Usa Chrome, Edge o Safari, o ${alternativa}.`,
  inseguro: `El micrófono solo funciona con una conexión segura (https). Abre la dirección https de la app o ${alternativa}.`,
  network: `El servicio de voz de este navegador no respondió. Prueba con Chrome o ${alternativa}.`,
  'audio-capture': `No se encontró un micrófono. Conecta uno o ${alternativa}.`,
  grabacion: `No se pudo usar el micrófono. Revisa que otra app no lo esté usando o ${alternativa}.`,
  transcripcion: detalle || `No se pudo transcribir el audio. Repite o ${alternativa}.`,
}[codigo] || `No se pudo reconocer la voz. Repite, edita el texto o ${alternativa}.`);

function vozEspanol() {
  const voces = speechSynthesis.getVoices().filter(v => v.lang?.toLowerCase().startsWith('es'));
  return voces.find(v => /es-(pe|419|mx|us|co)/i.test(v.lang) && /google|natural|online/i.test(v.name)) || voces.find(v => /natural|online|google/i.test(v.name)) || voces[0] || null;
}

export function hablar(texto, { alTerminar, alError } = {}) {
  if (!hayLectura || !texto) { alError?.(); return false; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = idioma;
  const v = vozEspanol();
  if (v) u.voice = v;
  u.rate = 1.02;
  u.onend = () => alTerminar?.();
  u.onerror = () => alError?.();
  speechSynthesis.speak(u);
  return true;
}

export const callar = () => { if (hayLectura) speechSynthesis.cancel(); };
if (hayLectura) speechSynthesis.getVoices();
