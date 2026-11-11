# Automatizaciones con IA

En RetroScape la IA hace lo que una persona no puede hacer bien en medio de una retrospectiva: leer todos los comentarios a la vez, recordar lo que se acordó hace dos semanas, notar que una frase delata a quien la escribió o entender un pedido dicho de forma informal. Las decisiones siguen siendo del equipo, y las reglas que lo protegen (anonimato, confirmaciones, quién ve qué) las aplica el sistema, no el modelo.

Cada integrante es responsable de una automatización, ligada al caso de uso que rediseñó en la LEC07.

| Automatización | Responsable | Caso de uso | Qué trabajo elimina | Quién decide |
|---|---|---|---|---|
| [Eco, asistente de voz en modo sala](#1-eco-asistente-de-voz-en-modo-sala) | Isaac Martel | CU-02 Expresar cómo viví el sprint | Manejar la sesión desde la pantalla mientras se conduce al grupo | El facilitador; el sistema exige confirmar lo irreversible |
| [Guardián del anonimato](#2-guardián-del-anonimato) | Diego Orrego | CU-03 Aportar un comentario anónimo | Releer cada comentario buscando lo que podría delatar a alguien | Quien escribe el comentario |
| [Análisis trazable y acta del sprint](#3-análisis-trazable-y-acta-del-sprint) | Sebastián Huaypar | CU-04 Analizar los comentarios | Agrupar comentarios a mano y redactar el acta | El facilitador revisa ambos borradores |
| [Continuidad entre sprints](#4-continuidad-entre-sprints) | Bryan Chontay | CU-05 Votar y registrar acciones | Revisar si las misiones anteriores funcionaron | El equipo, al votar |

## 1. Eco, asistente de voz en modo sala

**Cuándo se usa.** En retrospectivas presenciales: el facilitador está de pie frente al proyector, conduciendo la conversación, y no puede volver a la laptop para cada paso. En retros remotas no hace falta y se ignora.

**Qué hace.** Entiende pedidos dichos con naturalidad ("dales dos minutitos más", "ya muéstrales cómo quedó", "¿de qué se quejan más?") y los convierte en una de seis acciones: revelar el paisaje, poner un temporizador, cerrar los comentarios y analizar, publicar el análisis, cerrar la votación o preparar el acta. También responde preguntas sobre el estado de la sesión.

Reparte cada respuesta en tres salidas, como se diseñó en la Lec 10:

- **Voz**: una o dos frases para toda la sala.
- **Proyector**: solo información agregada que el equipo puede ver junta.
- **Celular del facilitador**: lo delicado o lo que solo le sirve a él (cuántos faltan, comentarios marcados por el guardián).

**Por qué necesita IA.** Un menú de comandos fijos obliga a recordar frases exactas, justo lo que no se puede hacer mientras se facilita. Eco además resume el estado de la sala en una frase corta, adaptada a la pregunta.

**Control humano.** La IA solo interpreta. El sistema decide si una acción necesita confirmación, con datos que calcula él mismo y no el modelo: si faltan personas por colocarse antes de revelar, si faltan votos antes de cerrar, o siempre antes de publicar el análisis al equipo. Eco tampoco puede hacer nada fuera de la fase actual. Los mismos botones de la pantalla siguen disponibles.

**Privacidad.** Eco nunca recibe el texto de los comentarios, solo conteos y nombres de temas, así que no puede leer en voz alta algo que exponga a alguien. Se activa al tocar el micrófono, no está escuchando todo el tiempo.

Código: `server/ia/eco.js` (prompt y acciones), `server/salas.js` (reglas de confirmación), `public/js/vistas/eco.js` (interfaz).

## 2. Guardián del anonimato

**Qué hace.** Antes de publicar, revisa el comentario y detecta tres riesgos: datos que identifican al autor ("como el único de QA", su propio nombre, detalles que solo él conoce), compañeros nombrados en tono de culpa y datos sensibles. Resalta el fragmento, explica el riesgo en una frase y propone una versión que conserva el problema. También propone la emoción del comentario, que la persona confirma o corrige y se guarda solo en su dispositivo.

**Por qué necesita IA.** Una lista de palabras encuentra nombres, pero no entiende que "me quedé tres noches con el bug de pagos" señala a una sola persona, ni que "gracias a Luis" no es una culpa. Lo que sí se resuelve con reglas se hace con reglas: los nombres exactos del equipo se buscan sin IA.

**Control humano.** No censura. La persona puede usar la sugerencia, editar o publicar igual. Si publica igual, el comentario sigue siendo anónimo, pero el facilitador lo ve marcado en el borrador del análisis y puede ocultarlo.

**Privacidad.** El nombre de quien escribe nunca viaja al LLM junto con su texto: ese nombre se revisa solo con reglas, en el servidor.

Código: `server/ia/guardian.js`, `public/js/vistas/compositor.js`.

## 3. Análisis trazable y acta del sprint

**Qué hace.** Al cerrar los comentarios, agrupa los comentarios por el problema de fondo aunque usen palabras distintas, nombra cada tema y propone acciones concretas y verificables. Al final de la retro, redacta el acta para el Product Owner y para quien no estuvo, con un criterio verificable por cada misión ("cómo sabremos que se cumplió").

**Por qué necesita IA.** Con veinte comentarios, agrupar a mano toma el tiempo que debería usarse en conversar. Redactar un acta legible a partir de votos, temas y responsables es el trabajo que nadie quiere hacer al final de la reunión.

**Control humano.** Los dos son borradores que solo ve el facilitador. En el análisis puede renombrar, fusionar o descartar temas, mover comentarios, editar acciones y agregar las del equipo. Cada tema muestra cuántos comentarios lo sustentan y cuáles son. El acta se edita antes de publicarla.

**Contra respuestas inventadas.** El servidor valida cada respuesta: descarta temas que no citan comentarios reales, ignora identificadores que no existen y deja sin tema lo que el modelo no agrupó.

Código: `server/ia/analisis.js`, `server/ia/acta.js`, `public/js/vistas/facilitador.js`.

## 4. Continuidad entre sprints

**Qué hace.** Al analizar, compara lo que el equipo dice hoy con las misiones del sprint anterior y clasifica cada una como *sigue ocurriendo*, *mejoró* o *sin evidencia*, citando los comentarios en que se basa. Para las que siguen ocurriendo, propone una acción ajustada que el facilitador puede llevar a la votación. También reconoce los temas que vuelven aunque se nombren distinto ("Entorno de pruebas inestable" y "Bloqueos con el entorno de pruebas") y los marca en el análisis y en la evolución del equipo.

**Por qué necesita IA.** El problema conocido de las retrospectivas es que las acciones se acuerdan y nadie revisa si funcionaron. Saber si una misión funcionó no es cuestión de marcar una casilla: hay que leer lo que el equipo cuenta y relacionarlo con lo acordado.

**Control humano.** La IA no cambia el estado de nada por su cuenta. Muestra su evidencia y el equipo decide si la misión ajustada entra a la votación.

Código: `server/ia/continuidad.js`, `public/js/vistas/equipo.js`.

## Qué cambió respecto a la PC2

| En la PC2 | Ahora | Motivo |
|---|---|---|
| Retrospectiva programada (crear la sala y enviar invitaciones al cerrar el sprint) | Reemplazada por Eco | No necesitaba IA: un evento de calendario hace lo mismo |
| Seguimiento de misiones creando tareas en GitHub Issues | Reemplazado por la continuidad con IA | Crear tareas es una integración; lo difícil es saber si la misión funcionó |
| Guardián del anonimato | Implementado | Se mantiene |
| Acta automática | Implementada, con criterios verificables por misión | Los criterios alimentan el seguimiento del sprint siguiente |

## Lo que no se automatizó

- **La votación.** Las misiones las elige el equipo con sus fichas; la IA no recomienda cuál votar.
- **Revelar, publicar y cerrar sin confirmación.** Son pasos que no se pueden deshacer y afectan a todos.
- **Asignar responsables.** Es una decisión del equipo.
- **Moderar comentarios.** El guardián avisa a quien escribe; el facilitador decide si oculta algo del análisis.

## Proveedor y fallos

Todas las llamadas pasan por `server/ia/gateway.js`, que tiene adaptadores para Gemini y Groq (se elige en `.env`) y uno simulado con reglas locales, solo para pruebas y demostraciones sin conexión. La interfaz muestra siempre qué proveedor se usa y marca el simulado como "IA simulada".

Si el proveedor real falla, la app no reemplaza la respuesta con la simulada: el guardián hace solo la revisión con reglas y lo avisa; el análisis ofrece reintentar o agrupar a mano; el acta deja una base con los datos de la sesión; Eco indica que se usen los botones.
