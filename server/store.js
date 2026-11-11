import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config, RAIZ } from './config.js';

let db = null;
let pendiente = null;

function semilla() {
  const mock = JSON.parse(readFileSync(RAIZ + 'data/mock/sprints.json', 'utf8'));
  const historial = mock.sprints.map(s => ({
    sprint: s.numero,
    cerradoEn: null,
    participantes: Object.values(s.distribucion).reduce((a, b) => a + b, 0),
    distribucion: s.distribucion,
    razones: s.razones || {},
    temas: (s.temas || []).map(nombre => ({ nombre, canonico: nombre, comentarios: null })),
    misiones: (s.misiones || []).map(m => ({ texto: m.texto, fichas: m.fichas, responsable: '' })),
    congeladas: s.ideasCongeladas || [],
    seguimiento: [],
    acta: '',
  }));
  const id = slug(mock.equipo.nombre);
  return {
    version: 1,
    equipos: { [id]: { id, nombre: mock.equipo.nombre, historial } },
    salas: {},
  };
}

export function cargar() {
  if (existsSync(config.archivoDatos)) {
    db = JSON.parse(readFileSync(config.archivoDatos, 'utf8'));
    // Lo que estaba en curso cuando se apagó el servidor no puede seguir en curso
    for (const sala of Object.values(db.salas)) {
      Object.values(sala.participantes).forEach(p => { p.conexiones = 0; });
      if (sala.analisis?.estado === 'procesando') sala.analisis = { estado: 'error', error: 'El servidor se reinició durante el análisis. Vuelve a pedirlo.' };
      if (sala.acta?.estado === 'procesando') sala.acta = { estado: 'vacio' };
    }
  } else {
    db = semilla();
    guardarYa();
  }
  return db;
}

function guardarYa() {
  mkdirSync(dirname(config.archivoDatos), { recursive: true });
  const tmp = config.archivoDatos + '.tmp';
  writeFileSync(tmp, JSON.stringify(db, null, 1));
  renameSync(tmp, config.archivoDatos);
}

export function guardar() {
  if (pendiente) return;
  pendiente = setTimeout(() => { pendiente = null; guardarYa(); }, 250);
}

export const datos = () => db;

export function slug(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'equipo';
}

export function obtenerOCrearEquipo(nombre) {
  const id = slug(nombre);
  if (!db.equipos[id]) db.equipos[id] = { id, nombre: nombre.trim(), historial: [] };
  return db.equipos[id];
}
