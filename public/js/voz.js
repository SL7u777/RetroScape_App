const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hayDictado = !!Reconocimiento;
export const hayLectura = 'speechSynthesis' in window;
const idioma = navigator.language?.startsWith('es') ? navigator.language : 'es-PE';

// Dictado del navegador; espera hasta `inicio` ms a que la persona empiece y se detiene tras un silencio de `espera` ms
export function dictar({ alParcial, alFinal, alError, espera = 1800, inicio = 7000 }) {
  if (!hayDictado) { alError?.('no-disponible'); return () => {}; }
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
  r.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') { terminado = true; alError?.(e.error, texto.trim()); } };
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

export const mensajeErrorVoz = codigo => ({
  'not-allowed': 'El navegador no dio permiso al micrófono. Puedes escribir tu comentario.',
  'service-not-allowed': 'El navegador no permite el dictado aquí. Puedes escribir tu comentario.',
  'no-disponible': 'Este navegador no tiene dictado por voz. Usa Chrome o Edge, o escribe tu comentario.',
  network: 'El dictado necesita conexión a internet. Puedes escribir tu comentario.',
  'audio-capture': 'No se encontró un micrófono. Puedes escribir tu comentario.',
}[codigo] || 'No se pudo reconocer la voz. Puedes repetir, editar el texto o escribir.');

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
