# Instalación y ejecución

## Requisitos

- Node.js 18.17 o superior (`node --version`).
- Chrome o Edge para usar la voz. En otros navegadores la app funciona igual y ofrece escribir.

El proyecto no tiene dependencias: no hace falta `npm install`.

## 0. Descargar el código

```bash
git clone https://github.com/SL7u777/RetroScape_App.git
cd RetroScape_App
```

## 1. Clave del proveedor de IA

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

En Windows (PowerShell): `Copy-Item .env.example .env`.

Usa **una** de estas opciones:

- **Gemini.** Entra a [Google AI Studio](https://aistudio.google.com), ve a *Get API key*, crea una clave y pégala en `GEMINI_API_KEY`. Deja `IA_PROVEEDOR=gemini`.
- **Groq.** Entra a [console.groq.com](https://console.groq.com), ve a *API Keys*, crea una clave (empieza con `gsk_`) y pégala en `GROQ_API_KEY`. Cambia a `IA_PROVEEDOR=groq`.

Los modelos se cambian con `GEMINI_MODEL` y `GROQ_MODEL`. El archivo `.env` está en `.gitignore`: la clave nunca se sube al repositorio ni llega al navegador.

Sin clave, o con `IA_PROVEEDOR=simulado`, la app usa reglas locales. Sirve para probar el flujo sin conexión, pero no es el análisis real, y la interfaz lo marca como "IA simulada".

## 2. Arrancar

En la consola, dentro de la carpeta del repositorio:

```bash
npm start
```

La consola muestra algo como:

```
RetroScape listo en http://localhost:5173
En la misma red:   http://192.168.1.40:5173
IA: Gemini (gemini-3.8-flash)
```

Abre la primera dirección en la laptop. Los demás entran desde su celular o laptop con la segunda, conectados a la misma red wifi. Para cambiar el puerto: `PORT=8080 npm start` (en PowerShell: `$env:PORT=8080; npm start`).

## 3. Una retrospectiva

1. **Facilitador:** en el inicio, *Facilitar una retro*, escribe el equipo (por ejemplo *Equipo Atlas*, que trae cuatro sprints de historial) y *Crear sala*. Aparece el código, por ejemplo `RS-4821`.
2. **Proyector:** en el panel del facilitador, *Abrir vista para el proyector*, y lleva esa pestaña a la pantalla de la sala. Toca *Activar voz de Eco* si quieres que Eco hable por el parlante del proyector.
3. **Miembros:** entran con el código y su nombre, y se colocan en el paisaje.
4. Al colocarse todos, el paisaje se revela. Luego vienen los comentarios, el análisis, la votación y el acta.
5. **Eco:** el botón *Eco* en la cabecera del facilitador. Toca el micrófono y habla, o escribe.
6. **Facilitar desde el celular:** si la laptop queda conectada al proyector, en el panel del facilitador elige *Facilitar desde mi celular* y abre ese enlace en tu teléfono. Así usas Eco y ves la información privada desde ahí. No compartas ese enlace con el equipo: da control de la sala.

## 4. Demostración sin público

Con la sala creada, en otra consola:

```bash
npm run equipo-simulado -- RS-4821
```

Une a 5 integrantes simulados que se colocan, dejan comentarios del sprint 15 del Equipo Atlas y votan cuando se abre la votación. Puedes unirte tú también desde otro dispositivo. Para otra cantidad: `npm run equipo-simulado -- RS-4821 4`.

## 5. Pruebas

```bash
npm test
```

Revisan la privacidad de las posiciones, que los comentarios no guarden autor, el guardián, el análisis, el límite de fichas, el cierre de la votación y las confirmaciones de Eco. Usan siempre el proveedor simulado y un archivo de datos temporal.

## Datos

Todo se guarda en `data/retroscape.json`, que se crea solo al primer arranque con el historial de ejemplo de `data/mock/sprints.json`. Para empezar de cero, borra ese archivo con el servidor detenido.

## Solución de problemas

| Problema | Qué hacer |
|---|---|
| El dictado no funciona en el celular | El navegador solo permite el micrófono en `localhost` o en HTTPS. Desde la red local con `http://192.168…` la app ofrece escribir. Para tener voz en los celulares, publica el servidor con HTTPS (por ejemplo, detrás de un túnel o un servidor con certificado). |
| "Este navegador no tiene dictado" | Usa Chrome o Edge. Firefox y Safari en escritorio no traen reconocimiento de voz. |
| Eco no habla en el proyector | En la pestaña del proyector toca *Activar voz de Eco*, y en el panel de Eco elige *Voz en el proyector*. |
| "IA simulada" aunque puse la clave | Revisa que `.env` esté en la raíz del proyecto, que la clave no tenga comillas de más y reinicia `npm start`. |
| El análisis no respondió | Revisa la clave y la conexión. Desde el panel puedes reintentar o agrupar a mano. |
| Los demás no pueden entrar | Deben estar en la misma red, y el firewall de la laptop debe permitir Node.js en redes privadas. |
