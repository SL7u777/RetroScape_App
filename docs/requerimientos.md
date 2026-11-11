# Requerimientos, historias de usuario y trazabilidad

Versión para la entrega final: 36 requerimientos funcionales, 9 no funcionales y 35 historias de usuario, con prioridad MoSCoW. La columna Origen indica si el requerimiento viene de la especificación inicial (LEC06), del rediseño de un caso de uso (CU-02 a CU-05) o de las automatizaciones con IA agregadas después de la PC2 (detalle en [ia.md](ia.md)).

## Requerimientos funcionales

| ID | Requerimiento | Prioridad | Origen |
|---|---|---|---|
| RF-01 | El sistema debe permitir crear una sala, generar un código único y copiarlo para compartirlo. | Must | LEC06 |
| RF-02 | El sistema debe permitir ingresar a una sala con su código sin registro obligatorio. | Must | LEC06 |
| RF-03 | El sistema debe permitir colocar el avatar en cima, valle o tormenta, arrastrándolo o seleccionando la zona con menú accesible o teclado. | Must | LEC06 |
| RF-04 | El sistema debe mantener privadas las posiciones durante la colocación y revelarlas a la vez, de forma anónima por defecto, cuando todos se hayan colocado, venza el tiempo o el facilitador cierre la fase; después de la revelación, cada miembro puede mostrar su nombre. | Must | LEC06; modificado en CU-02 |
| RF-05 | El sistema debe anunciar al usuario su zona y ofrecer un resumen textual de la distribución tras la revelación. | Must | LEC06 |
| RF-06 | El sistema debe permitir ingresar comentarios por voz (con transcripción) o por texto, como canales equivalentes. | Must | LEC06 |
| RF-07 | El sistema debe mostrar, antes de publicar, una vista previa del comentario que indique que se publicará de forma anónima y permita editarlo, cancelarlo, repetir el dictado o confirmarlo. | Must | LEC06; modificado en CU-03 |
| RF-08 | El sistema debe publicar los comentarios sin asociarlos al autor y descartar el audio después de transcribirlo. | Must | LEC06 |
| RF-09 | El sistema debe comunicar en forma visual y textual cada estado (grabando, procesando, publicado, error) y no presentar como publicado un comentario cuyo registro no se haya confirmado. | Must | LEC06; modificado en CU-03 |
| RF-10 | El sistema debe leer en voz alta (TTS) los resúmenes y textos relevantes cuando el usuario lo solicite. | Should | LEC06 |
| RF-11 | El sistema debe permitir ajustar tamaño de texto, alto contraste, modo enfoque y reducción de animaciones. | Must | LEC06 |
| RF-12 | El sistema debe mostrar ayuda contextual en cada fase ("¿Qué hago aquí?") sin sacar al usuario del flujo. | Must | LEC06 |
| RF-13 | El sistema debe mantener un perfil persistente (preferencias, ritmo, tiempo de espera del dictado) que el usuario pueda modificar y que se actualice con el uso. | Must | LEC06 |
| RF-14 | El sistema debe proponer la emoción inferida del comentario y permitir confirmarla, corregirla o rechazarla antes de guardarla en el perfil. | Must | LEC06 |
| RF-15 | El sistema debe sincronizar en tiempo real el estado de la sala entre los participantes. | Must | LEC06 |
| RF-16 | El sistema debe agrupar los comentarios por temas mediante el LLM y proponer acciones en un borrador que solo ve el facilitador, quien puede renombrar, fusionar o descartar temas y editar acciones antes de publicarlos al equipo. | Must | LEC06; modificado en CU-04 |
| RF-17 | El sistema debe detectar temas recurrentes entre sprints y mostrar la evolución del paisaje colectivo. | Must | LEC06 |
| RF-18 | El sistema debe permitir votar las acciones repartiendo 3 fichas de energía por persona (acumulables en una acción o repartidas), mostrar el resultado al cierre y registrar las acciones adoptadas como misiones del sprint. | Must | LEC06; modificado en CU-05 |
| RF-19 | El sistema debe dar retroalimentación afectiva (microinteracciones) al colocar, revelar (cuenta regresiva y clima del equipo), publicar, votar y adoptar misiones (estandartes), con equivalente textual y respetando la reducción de animaciones. | Must | LEC06; modificado en CU-02 y CU-05 |
| RF-20 | El sistema debe permitir marcar hasta dos etiquetas opcionales de razón (carga de trabajo, comunicación, bloqueos, logros, herramientas u otro) y presentarlas solo de forma agregada, sin asociarlas al autor. | Should | Nuevo en CU-02 |
| RF-21 | El sistema debe mostrar al miembro con perfil, de forma privada y ocultable, su posición del sprint anterior y, a todos, un recordatorio saltable del paisaje y las misiones de ese sprint. | Should | Nuevo en CU-02 |
| RF-22 | El sistema debe ofrecer en pantallas pequeñas la selección de zona por toque en franjas, sin necesidad de arrastrar. | Must | Nuevo en CU-02 |
| RF-23 | El sistema debe mostrar a todos el avance de la colocación sin revelar posiciones, permitir adelantar el comentario durante la espera y guardar la foto anónima del sprint al revelar. | Should | Nuevo en CU-02 |
| RF-24 | El sistema debe permitir, ante un error de reconocimiento de voz, repetir el dictado, editar el texto o cambiar a escritura sin perder el contenido ya ingresado. | Must | Nuevo en CU-03 |
| RF-25 | El sistema debe ocultar los totales de votos hasta el cierre, mostrando solo cuántos miembros ya votaron, y cerrar la votación cuando todos confirmen o venza el tiempo, con cierre manual del facilitador como alternativa. | Must | Nuevo en CU-05 |
| RF-26 | El sistema debe guardar las acciones no adoptadas en un banco de ideas congeladas y permitir al facilitador reincorporarlas a la votación de un sprint posterior. | Should | Nuevo en CU-05 |
| RF-27 | El sistema debe mostrar al Product Owner las misiones adoptadas sobre el paisaje del sprint, con una lista textual equivalente. | Could | Nuevo en CU-05 |
| RF-28 | El sistema debe mostrar, para cada tema propuesto por el LLM, cuántos comentarios lo sustentan y permitir consultarlos, e identificar temas y acciones como sugerencias generadas por IA. | Must | Nuevo en CU-04 |
| RF-29 | El sistema debe ofrecer un modo de agrupación manual cuando el LLM no responda, en el que el facilitador asigna comentarios a temas y redacta acciones. | Should | Nuevo en CU-04 |
| RF-30 | El sistema debe permitir al facilitador agregar acciones propuestas por el equipo, que se distinguen de las sugeridas por la IA y entran a la votación en igualdad de condiciones. | Should | Nuevo en CU-04 |
| RF-31 | El sistema debe revisar cada comentario antes de publicarlo, con reglas y con el LLM, para detectar datos que identifiquen al autor, compañeros asociados a una culpa o datos sensibles; debe resaltar el fragmento, explicar el riesgo, proponer una versión que conserve el problema y dejar que el autor decida. El nombre del autor no se envía al LLM. | Must | Automatización IA (CU-03) |
| RF-32 | El sistema debe marcar, solo para el facilitador, los comentarios publicados a pesar del aviso del guardián y permitirle ocultarlos del análisis sin revelar su autor. | Should | Automatización IA (CU-03) |
| RF-33 | El sistema debe comparar los comentarios del sprint con las misiones del sprint anterior, clasificar cada misión como "sigue ocurriendo", "mejoró" o "sin evidencia" citando los comentarios en que se basa, proponer una acción ajustada para las que siguen ocurriendo y reconocer los temas que se repiten entre sprints aunque cambie su redacción. | Must | Automatización IA (CU-05) |
| RF-34 | El sistema debe redactar con el LLM un borrador del acta (resumen, clima, temas, misiones con un criterio verificable y seguimiento) que el facilitador edita antes de publicarla, que se puede descargar y escuchar, y cuyos criterios se usan en el seguimiento del sprint siguiente. | Must | Automatización IA (CU-04) |
| RF-35 | El sistema debe ofrecer al facilitador un asistente de voz (Eco) que interprete pedidos en lenguaje natural para revelar, poner temporizadores, analizar, abrir o cerrar la votación y preparar el acta; que responda preguntas sobre el estado de la sesión; que reparta la información entre voz, proyector y pantalla privada; y que pida confirmación, decidida por el sistema, antes de acciones irreversibles. | Must | Automatización IA (CU-02) |
| RF-36 | El sistema debe ofrecer una vista de proyector de solo lectura con el código de la sala, el paisaje, información agregada de la fase y los subtítulos de Eco. | Should | Automatización IA (CU-02) |

## Requerimientos no funcionales

| ID | Requerimiento | Categoría | Prioridad |
|---|---|---|---|
| RNF-01 | La interfaz debe cumplir WCAG 2.2 AA, no comunicar información solo por color, gráfico o audio, y ser operable sin depender exclusivamente de mouse, gestos o voz. | Accesibilidad | Must |
| RNF-02 | Un usuario nuevo debe completar el flujo principal (ingresar, colocarse, comentar, votar) en 5 minutos o menos, sin documentación externa, con pasos cortos, indicador de progreso y mensajes breves y consistentes. | Usabilidad | Must |
| RNF-03 | La interfaz debe implementar los niveles visceral, conductual y reflexivo de Norman. | Diseño emocional | Must |
| RNF-04 | Los eventos de la sala deben sincronizarse en 1 s o menos, y la interfaz debe cargar desde caché en menos de 2 s en visitas recurrentes. | Rendimiento | Must |
| RNF-05 | El sistema debe ser instalable como PWA, adaptable a distintos tamaños de pantalla y cargar sin conexión, indicando que la sala la requiere. | Compatibilidad | Must |
| RNF-06 | El sistema debe conservar el estado confirmado al recargar o reconectarse y avisar cuando falle la conexión o un servicio externo. | Disponibilidad | Must |
| RNF-07 | El sistema no debe almacenar audio ni identificadores del autor en los comentarios; al LLM y a los logs solo debe llegar contenido anonimizado. | Privacidad | Must |
| RNF-08 | El sistema debe usar HTTPS, mantener las claves de los proveedores fuera del navegador, sanitizar las entradas y restringir el acceso a la sala a quienes tengan el código, limitando los intentos fallidos. | Seguridad | Must |
| RNF-09 | La comunicación con el LLM debe pasar por una capa de abstracción que permita cambiar de proveedor sin modificar la lógica, e incluir un proveedor simulado para pruebas. | Mantenibilidad | Must |

## Historias de usuario

### HU-01: Crear una sala

Como **Scrum Master** quiero crear una sala con un código único para invitar a mi equipo de forma rápida.

Cubre: RF-01, RNF-06

- **Escenario 1: Creación exitosa.** Dado que estoy en la pantalla de inicio, cuando selecciono "Crear sala", entonces se crea la sala, se genera un código único y puedo copiarlo para compartirlo.
- **Escenario 2: Backend no disponible.** Dado que el backend no está disponible, cuando intento crear la sala, entonces el sistema me avisa que no se pudo crear, no muestra ningún código y me sugiere reintentar.

### HU-02: Ingresar con código

Como **miembro del equipo** quiero ingresar a la sala con su código, sin registrarme, para participar con el menor esfuerzo.

Cubre: RF-02, RNF-08

- **Escenario 1: Ingreso exitoso.** Dado que existe una sala activa, cuando ingreso su código correcto, entonces entro a la sala sin crear una cuenta.
- **Escenario 2: Código inválido.** Dado que ingreso un código inválido, cuando intento entrar, entonces veo un mensaje claro y, tras 5 intentos fallidos seguidos, el sistema bloquea temporalmente nuevos intentos.

### HU-03: Colocar mi avatar

Como **miembro del equipo** quiero colocar mi avatar en cima, valle o tormenta para expresar cómo viví el sprint.

Cubre: RF-03, RF-19, RNF-03

- **Escenario 1: Colocación exitosa.** Dado que la fase de colocación está abierta, cuando arrastro mi avatar a una zona, entonces queda colocado con una microinteracción y el texto "Tu avatar está en el Valle".
- **Escenario 2: Avatar fuera de zona.** Dado que estoy arrastrando mi avatar, cuando lo suelto fuera de una zona válida, entonces vuelve a su posición con un rebote suave y un mensaje que indica dónde soltarlo.

### HU-04: Participar sin ver el paisaje

Como **miembro con discapacidad visual** quiero seleccionar mi zona y conocer la distribución del equipo sin depender del paisaje gráfico, para participar en igualdad.

Cubre: RF-03, RF-05, RNF-01

- **Escenario 1: Selección accesible.** Dado que uso lector de pantalla o teclado, cuando navego por las zonas y selecciono una, entonces cada zona tiene un nombre accesible y el sistema me anuncia dónde quedé.
- **Escenario 2: Distribución tras la revelación.** Dado que se revelaron los avatares, cuando consulto el paisaje, entonces recibo un resumen textual ("3 en cima, 2 en valle, 1 en tormenta").
- **Escenario 3: Daltonismo.** Dado que tengo daltonismo, cuando observo el paisaje, entonces distingo cada zona por su etiqueta e icono, sin depender del color.

### HU-05: Colocación privada y revelación anónima

Como **miembro con ansiedad social** quiero que mi posición permanezca oculta hasta que todos se coloquen y que la revelación no muestre nombres, para expresarme sin sentirme expuesto.

Cubre: RF-04, RF-15, RF-19

- **Escenario 1: Revelación automática y anónima.** Dado que todos los miembros se colocaron en privado, cuando el último confirma su posición, entonces se inicia una cuenta regresiva en todas las pantallas y se revelan figuras sin nombre, con un anuncio textual de la distribución.
- **Escenario 2: Mostrar mi nombre.** Dado que la distribución ya se reveló, cuando activo "Mostrar mi nombre", entonces solo mi avatar muestra mi nombre y el resto sigue anónimo.
- **Escenario 3: Cambio fuera de fase.** Dado que la fase ya se cerró, cuando intento cambiar mi zona, entonces el sistema lo rechaza y conserva mi selección.

### HU-06: Comentar por voz

Como **miembro del equipo** quiero dictar mi comentario y ver que el sistema me está escuchando, para participar sin escribir.

Cubre: RF-06, RF-09

- **Escenario 1: Dictado exitoso.** Dado que presiono el micrófono, cuando hablo, entonces veo el indicador "Grabando", luego "Procesando", y la transcripción pasa al editor.
- **Escenario 2: Micrófono denegado.** Dado que el navegador deniega el micrófono, cuando intento dictar, entonces veo un mensaje claro y el sistema resalta la caja de texto como alternativa.

### HU-07: Revisar mi comentario antes de publicarlo

Como **miembro con discapacidad del habla** quiero escribir o corregir mi comentario y ver cómo se publicará, para participar sin depender de la voz.

Cubre: RF-06, RF-07, RF-09, RF-19, RNF-08

- **Escenario 1: Vista previa anónima.** Dado que tengo un comentario escrito o transcrito, cuando paso a la vista previa y confirmo, entonces veo el aviso "Se publicará de forma anónima", se publica la versión corregida y aparece la confirmación "Publicado".
- **Escenario 2: Cancelar o repetir.** Dado que estoy en la vista previa, cuando elijo "Cancelar" o "Volver a dictar", entonces no se publica nada.
- **Escenario 3: Comentario vacío o con código.** Dado que mi comentario está vacío o contiene etiquetas de código, cuando intento publicarlo, entonces el botón se deshabilita si está vacío y, si tiene código, se muestra como texto plano sin ejecutarse.

### HU-08: Publicar de forma anónima

Como **miembro con ansiedad social** quiero que mi comentario se publique sin asociarse a mí, para opinar con honestidad.

Cubre: RF-08, RNF-07

- **Escenario 1: Publicación anónima.** Dado que publico un comentario, cuando se guarda, entonces no muestra autor, el registro no contiene mi ID ni mi IP y el audio se descarta.
- **Escenario 2: Fallo de transcripción.** Dado que la transcripción falla a mitad de la grabación, cuando el sistema detecta el error, entonces descarta el audio igualmente.

### HU-09: Ajustar la interfaz visual

Como **miembro con baja visión** quiero aumentar el texto y activar el alto contraste, para leer la interfaz cómodamente.

Cubre: RF-11, RNF-01

- **Escenario 1: Ajuste exitoso.** Dado que abro las preferencias, cuando activo el alto contraste y aumento el texto, entonces la interfaz se adapta al instante sin perder funciones.
- **Escenario 2: Zoom al 200 %.** Dado que hago zoom al 200 %, cuando navego por la sala, entonces todos los controles siguen visibles y operables.

### HU-10: Modo enfoque y ayuda

Como **miembro con TDAH** quiero reducir los estímulos y saber qué hacer en cada fase, para no abrumarme.

Cubre: RF-11, RF-12, RNF-02

- **Escenario 1: Enfoque y ayuda.** Dado que activé el modo enfoque, cuando toco "¿Qué hago aquí?", entonces las animaciones están pausadas, veo una explicación breve sin cambiar de pantalla y el indicador del paso actual.
- **Escenario 2: Sin conexión.** Dado que perdí la conexión, cuando abro la ayuda, entonces se muestra igualmente desde la caché.

### HU-11: Perfil que se adapta

Como **miembro del equipo** quiero que mis preferencias se conserven y se ajusten con mi uso, para tener una experiencia cada vez más adaptada.

Cubre: RF-13

- **Escenario 1: Preferencias conservadas.** Dado que configuré mis preferencias, cuando vuelvo a otra retrospectiva, entonces se aplican automáticamente.
- **Escenario 2: Adaptación con el uso.** Dado que corrijo mis transcripciones con frecuencia, cuando inicio un nuevo dictado, entonces el sistema me sugiere ampliar el tiempo de espera o usar texto, y solo lo aplica si acepto.
- **Escenario 3: Datos borrados.** Dado que se borraron los datos del navegador, cuando entro de nuevo, entonces se cargan los valores por defecto y se me avisa que puedo personalizarlos.

### HU-12: Confirmar la emoción inferida

Como **miembro neurodivergente** quiero confirmar o corregir la emoción que el sistema infiere de mi comentario, para que no se guarde una interpretación equivocada.

Cubre: RF-14

- **Escenario 1: Corrección.** Dado que el sistema infiere "Enojo" de mi comentario, cuando la cambio a "Frustración", entonces se guarda mi corrección en el perfil.
- **Escenario 2: Sin respuesta.** Dado que el sistema me propone una emoción, cuando cierro el aviso sin responder, entonces el comentario se publica, pero no se guarda ninguna emoción.

### HU-13: Sala sincronizada

Como **miembro del equipo** quiero ver los cambios de la sala al instante, para participar de forma coordinada.

Cubre: RF-15, RNF-04, RNF-06

- **Escenario 1: Sincronización exitosa.** Dado que varios estamos conectados, cuando alguien se coloca, publica o vota, entonces todas las pantallas se actualizan en 1 segundo o menos.
- **Escenario 2: Pérdida de conexión.** Dado que pierdo la conexión, cuando la app lo detecta, entonces muestra "Sin conexión", conserva lo confirmado y sincroniza al reconectarme.

### HU-14: Instalar la app

Como **miembro del equipo** quiero instalar RetroScape como app, para abrirla rápido desde mi dispositivo.

Cubre: RNF-04, RNF-05

- **Escenario 1: Instalación y carga.** Dado que mi navegador soporta PWA, cuando la instalo y la abro de nuevo, entonces carga en menos de 2 segundos.
- **Escenario 2: Sin conexión.** Dado que estoy sin conexión, cuando abro la app, entonces carga la interfaz e indica que la sala requiere conexión, sin mostrar datos desactualizados como actuales.

### HU-15: Análisis con LLM

Como **Scrum Master** quiero que los comentarios se agrupen por temas con acciones propuestas, para convertir la retrospectiva en decisiones.

Cubre: RF-16, RNF-07, RNF-08, RNF-09

- **Escenario 1: Borrador del análisis.** Dado que cerré la fase de comentarios, cuando solicito el análisis, entonces el backend envía solo texto anonimizado a través de la capa de abstracción, sin exponer claves en el navegador, y recibo temas y acciones en un borrador que el equipo todavía no ve.
- **Escenario 2: Proveedor no disponible.** Dado que el proveedor del LLM no responde, cuando solicito el análisis, entonces el sistema me avisa, me permite reintentar o agrupar manualmente y no presenta resultados simulados como reales.

### HU-16: Escuchar los resúmenes

Como **miembro con discapacidad visual** quiero que el sistema me lea en voz alta los temas y las misiones, para acceder a ellos sin leerlos.

Cubre: RF-10

- **Escenario 1: Lectura exitosa.** Dado que se muestran los resultados, cuando presiono "Escuchar", entonces se leen en orden.
- **Escenario 2: TTS no disponible.** Dado que el TTS no está disponible, cuando presiono "Escuchar", entonces veo el mensaje "No se pudo reproducir" y el texto sigue disponible para mi lector de pantalla.

### HU-17: Votar con fichas de energía

Como **miembro del equipo** quiero repartir mis fichas entre las acciones sin ver los votos de los demás, para expresar cuánto me importa cada una sin dejarme llevar por la mayoría.

Cubre: RF-18, RF-19, RF-25, RNF-03

- **Escenario 1: Reparto de fichas.** Dado que la votación está abierta y tengo 3 fichas, cuando asigno 2 fichas a una acción y 1 a otra y confirmo, entonces cada ficha reacciona con una microinteracción, se marca "Voto confirmado" y los demás solo ven que ya voté.
- **Escenario 2: Fichas agotadas.** Dado que ya asigné mis 3 fichas, cuando intento asignar otra, entonces el sistema lo impide y me indica que puedo retirar una ficha para moverla.
- **Escenario 3: Votación cerrada.** Dado que la votación ya cerró, cuando intento votar, entonces el sistema lo rechaza y conserva el resultado.

### HU-18: Tendencias entre sprints

Como **Agile Coach** quiero ver los temas recurrentes y la evolución del paisaje, para detectar problemas persistentes.

Cubre: RF-17, RNF-03

- **Escenario 1: Historial suficiente.** Dado que hay 2 o más sprints registrados, cuando abro la evolución, entonces veo los temas recurrentes y cómo cambió la distribución del paisaje.
- **Escenario 2: Un solo sprint.** Dado que solo hay un sprint, cuando pido tendencias, entonces el sistema indica que se necesitan al menos 2 sprints.

### HU-19: Consultar las misiones del sprint

Como **Product Owner** quiero consultar las misiones adoptadas sobre el paisaje del sprint, para saber qué mejoras pueden afectar al producto.

Cubre: RF-18, RF-27

- **Escenario 1: Consulta exitosa.** Dado que la retrospectiva se cerró, cuando abro el resumen del sprint, entonces veo las misiones sobre el paisaje con sus fichas y una lista textual ordenada por votos.
- **Escenario 2: Retrospectiva en curso.** Dado que la retrospectiva sigue en curso, cuando abro el resumen, entonces el sistema indica "Retrospectiva en curso" y no muestra resultados parciales.

### HU-20: Indicar por qué me sentí así

Como **miembro del equipo** quiero marcar con un toque la causa principal de cómo viví el sprint, para explicar mi posición sin tener que escribir.

Cubre: RF-20

- **Escenario 1: Etiquetas marcadas.** Dado que coloqué mi avatar, cuando marco "Bloqueos" y "Comunicación", entonces tras la revelación, el resumen muestra cuántas veces se marcó cada etiqueta, sin indicar quién las marcó.
- **Escenario 2: Tercera etiqueta.** Dado que ya marqué dos etiquetas, cuando intento marcar una tercera, entonces el sistema no la marca y me indica que el máximo es dos.
- **Escenario 3: Sin etiquetas.** Dado que coloqué mi avatar, cuando continúo sin marcar etiquetas, entonces mi colocación se registra igual.

### HU-21: Recordar el sprint anterior

Como **miembro del equipo** quiero ver dónde estuve el sprint pasado y qué acordamos, para evaluar este sprint con contexto.

Cubre: RF-21, RF-13

- **Escenario 1: Con historial.** Dado que tengo perfil y existe un sprint anterior, cuando se abre la fase de colocación, entonces veo un recordatorio saltable con el paisaje y las misiones anteriores, y una silueta de mi posición anterior que solo yo veo.
- **Escenario 2: Primer sprint.** Dado que es el primer sprint del equipo, cuando se abre la fase de colocación, entonces no se muestran el recordatorio ni la silueta.
- **Escenario 3: Ocultar la silueta.** Dado que veo mi silueta anterior, cuando elijo ocultarla, entonces desaparece y la preferencia se guarda en mi perfil.

### HU-22: Colocarme desde el celular

Como **miembro del equipo** quiero elegir mi zona con un toque desde el celular, para no tener que arrastrar en una pantalla pequeña.

Cubre: RF-22, RNF-05

- **Escenario 1: Selección por toque.** Dado que uso un celular, cuando toco la franja "Valle", entonces mi avatar queda colocado con la misma confirmación que en la laptop.
- **Escenario 2: Rotación de pantalla.** Dado que ya elegí una zona, cuando giro el celular, entonces la selección se conserva y el paisaje se adapta al nuevo ancho.

### HU-23: Ver el avance sin revelar posiciones

Como **Scrum Master** quiero saber cuántos ya se colocaron sin ver dónde, para decidir cuándo continuar sin presionar a nadie.

Cubre: RF-23

- **Escenario 1: Avance anónimo.** Dado que 4 de 6 miembros se colocaron, cuando miro el paisaje, entonces veo "4 de 6 listos" sin ninguna posición visible.
- **Escenario 2: Espera útil.** Dado que ya me coloqué y otros no, cuando toco "Adelantar mi comentario", entonces puedo escribir o dictar mi comentario mientras los demás terminan.
- **Escenario 3: Foto del sprint.** Dado que se reveló la distribución, cuando consulto la evolución del equipo, entonces la foto anónima de este sprint aparece guardada.

### HU-24: Recuperarme de un error de dictado

Como **miembro con discapacidad del habla** quiero corregir o cambiar de método cuando el dictado falla, para no perder lo que ya dije.

Cubre: RF-24, RF-09

- **Escenario 1: Fallo de reconocimiento.** Dado que dicté parte de mi comentario, cuando el reconocimiento de voz falla, entonces veo un mensaje claro con las opciones "Repetir", "Editar" y "Escribir", y el texto ya transcrito se conserva.
- **Escenario 2: Cambio a escritura.** Dado que estoy dictando, cuando elijo "Escribir", entonces el dictado se detiene y el contenido pasa al editor de texto.

### HU-25: Revelación de misiones

Como **miembro del equipo** quiero que la votación se cierre sola cuando todos terminen y que el resultado se revele a la vez, para no depender del facilitador ni influir en los demás.

Cubre: RF-25, RF-19

- **Escenario 1: Cierre automático.** Dado que 5 de 6 miembros confirmaron su voto, cuando el último confirma, entonces la votación se cierra, todos ven los totales y las acciones ganadoras se convierten en estandartes de misión con un anuncio textual.
- **Escenario 2: Tiempo vencido.** Dado que venció el tiempo y faltan votos, cuando el sistema cierra la votación, entonces se revelan los resultados con los votos confirmados y se indica cuántos no votaron.
- **Escenario 3: Cierre manual.** Dado que la votación está abierta, cuando el facilitador elige "Cerrar ahora", entonces se revelan los resultados de la misma forma.

### HU-26: Rescatar ideas congeladas

Como **Scrum Master** quiero que las acciones no adoptadas se guarden, para retomarlas en otro sprint en lugar de perderlas.

Cubre: RF-26

- **Escenario 1: Ideas guardadas.** Dado que la votación se cerró, cuando reviso el resultado, entonces las acciones no adoptadas aparecen en el banco de ideas congeladas.
- **Escenario 2: Reincorporar.** Dado que empieza la votación de un sprint posterior, cuando elijo una idea congelada, entonces se agrega a la votación como una acción más.
- **Escenario 3: Banco vacío.** Dado que todas las acciones fueron adoptadas, cuando abro el banco, entonces el sistema indica que no hay ideas congeladas.

### HU-27: Revisar el análisis antes de publicarlo

Como **Scrum Master** quiero revisar y ajustar lo que propone el LLM y ver en qué comentarios se basa, para que el equipo reciba un análisis fiel a lo que dijo.

Cubre: RF-16, RF-28

- **Escenario 1: Ajuste del borrador.** Dado que recibí el borrador del análisis, cuando fusiono dos temas, renombro uno y descarto una acción, entonces los cambios se aplican y solo se publican al presionar "Publicar al equipo".
- **Escenario 2: Origen de un tema.** Dado que un tema indica "Sugerido por IA · 4 comentarios", cuando lo abro, entonces veo los 4 comentarios anónimos que lo sustentan.
- **Escenario 3: Tema sin sustento.** Dado que el LLM propone un tema que no corresponde a los comentarios, cuando lo reviso, entonces puedo descartarlo y no aparece en la versión publicada.

### HU-28: Agrupar a mano si el LLM falla

Como **Scrum Master** quiero agrupar los comentarios manualmente cuando el LLM no está disponible, para no detener la retrospectiva.

Cubre: RF-29

- **Escenario 1: Modo manual.** Dado que el LLM no respondió tras reintentar, cuando elijo "Agrupar manualmente", entonces puedo crear temas, asignarles comentarios y redactar acciones, que no se marcan como generadas por IA.
- **Escenario 2: Comentarios sin tema.** Dado que quedan comentarios sin asignar, cuando intento publicar, entonces el sistema me indica cuántos quedan y me permite publicarlos en "Otros".

### HU-29: Agregar acciones del equipo

Como **Scrum Master** quiero agregar las acciones que el equipo propone durante la conversación, para que la votación no se limite a lo que sugiere la IA.

Cubre: RF-30

- **Escenario 1: Acción agregada.** Dado que estoy revisando el análisis, cuando agrego la acción "Definir criterios de terminado por historia", entonces aparece con la marca "Propuesta del equipo" y entra a la votación.
- **Escenario 2: Acción vacía.** Dado que abrí el campo para una nueva acción, cuando intento guardarla sin texto, entonces el botón permanece deshabilitado.

### HU-30: Revisar mi comentario antes de que me exponga

Como **miembro del equipo** quiero que el sistema me avise si mi comentario podría identificarme o señalar a un compañero, para opinar con honestidad sin exponerme ni exponer a nadie.

Cubre: RF-31, RNF-07

- **Escenario 1: Riesgo detectado.** Dado que escribí "Yo, Kevin, me quedé tres noches porque Luis subió código sin pruebas", cuando elijo "Revisar y publicar", entonces veo resaltados "Yo, Kevin" y "Luis", una explicación de cada riesgo y una versión centrada en el proceso.
- **Escenario 2: Decido yo.** Dado que el guardián me avisó de un riesgo, cuando elijo "Publicar igual", entonces el comentario se publica de forma anónima sin cambios.
- **Escenario 3: Sin riesgo.** Dado que mi comentario habla del proceso, cuando lo reviso, entonces no aparece ningún aviso y puedo publicarlo.
- **Escenario 4: IA no disponible.** Dado que el proveedor del LLM no responde, cuando reviso mi comentario, entonces se revisan solo los nombres del equipo y se me avisa que la revisión fue básica.

### HU-31: Moderar sin conocer al autor

Como **Scrum Master** quiero ver qué comentarios se publicaron a pesar del aviso del guardián, para decidir si los oculto del análisis antes de mostrarlo.

Cubre: RF-32

- **Escenario 1: Comentario marcado.** Dado que un comentario se publicó tras un aviso por señalar a una persona, cuando reviso el borrador del análisis, entonces lo veo marcado, sin autor, con la opción "Ocultar".
- **Escenario 2: Volver a incluir.** Dado que oculté un comentario, cuando elijo "Volver a incluir", entonces regresa a la lista sin tema.

### HU-32: Saber si nuestras misiones funcionaron

Como **Scrum Master** quiero ver si las misiones del sprint anterior resolvieron el problema, para no repetir acciones que no funcionan.

Cubre: RF-33, RF-17

- **Escenario 1: Misión que persiste.** Dado que en el sprint anterior se adoptó "Avisar en el canal antes de modificar el entorno de pruebas", cuando dos comentarios de hoy dicen que nadie avisó, entonces la misión aparece como "Sigue ocurriendo", con esos comentarios como evidencia y una acción ajustada.
- **Escenario 2: Llevar a la votación.** Dado que veo una acción ajustada, cuando elijo "Llevar a la votación", entonces entra a la votación marcada como "Seguimiento".
- **Escenario 3: Sin evidencia.** Dado que ningún comentario habla de una misión, cuando reviso el seguimiento, entonces la misión aparece como "Sin evidencia" y no se le asigna un fracaso.
- **Escenario 4: Tema que vuelve.** Dado que hoy aparece "Entorno de pruebas inestable" y en sprints anteriores "Bloqueos con el entorno de pruebas", cuando reviso los temas, entonces el tema muestra en qué sprints ya apareció.

### HU-33: Recibir un acta sin escribirla

Como **Product Owner** quiero leer un acta clara de la retrospectiva, para saber qué cambiará el equipo sin haber estado en la reunión.

Cubre: RF-34, RF-10, RF-27

- **Escenario 1: Borrador del acta.** Dado que la votación se cerró, cuando el facilitador elige "Preparar acta con IA", entonces recibe un borrador con resumen, clima, temas, misiones con un criterio verificable y seguimiento, que solo él ve.
- **Escenario 2: Publicación.** Dado que el facilitador editó el borrador, cuando elige "Publicar acta y cerrar la retro", entonces el acta queda en la evolución del equipo y los miembros pueden leerla o escucharla.
- **Escenario 3: IA no disponible.** Dado que el LLM no responde, cuando se pide el acta, entonces el facilitador recibe una base con los datos de la sesión para completarla.

### HU-34: Guiar la retro con la voz

Como **Scrum Master** que facilita de pie frente al proyector, quiero pedir las acciones de la sesión hablando, para no volver a la laptop en cada paso.

Cubre: RF-35

- **Escenario 1: Pedido informal.** Dado que la sesión está en comentarios, cuando digo "dales dos minutitos más", entonces Eco pone un temporizador de 2 minutos y lo confirma en una frase.
- **Escenario 2: Confirmación con datos.** Dado que faltan 2 personas por colocarse, cuando digo "revela el paisaje", entonces Eco no revela, me dice que faltan 2 y espera mi "sí".
- **Escenario 3: Información delicada.** Dado que hay un comentario marcado por el guardián, cuando pregunto si debo revisar algo, entonces el detalle aparece solo en mi pantalla y no en el proyector ni en la voz.
- **Escenario 4: Fuera de fase.** Dado que la sesión está en colocación, cuando pido cerrar la votación, entonces Eco explica que ahora no se puede y no hace nada.

### HU-35: Ver la sesión en el proyector

Como **miembro del equipo** en una sala presencial quiero ver en el proyector el paisaje y el avance de la fase, para seguir la sesión juntos sin depender de mi celular.

Cubre: RF-36, RNF-07

- **Escenario 1: Vista compartida.** Dado que el facilitador abrió la vista del proyector, cuando avanza la sesión, entonces el proyector muestra el código, el paisaje, el avance y los subtítulos de Eco, sin comentarios individuales ni votos parciales.

## Matriz de trazabilidad

Estado: **Implementado**, está en el código y se verificó en el recorrido completo o en `npm test`; **Parcial**, implementado con una limitación indicada; **Por validar**, implementado y pendiente de la prueba con usuarios.

| ID Req | Descripción | Tipo | Prioridad | ID HU | Estado | Evidencia / Criterio de aceptación |
|---|---|---|---|---|---|---|
| RF-01 | Crear sala con código único copiable | FR | Must | HU-01 | Implementado | Se genera un código único copiable; si el backend falla, se avisa y no se muestra código |
| RF-02 | Ingresar con código sin registro | FR | Must | HU-02 | Implementado | Con código válido se accede a la sala sin crear cuenta |
| RF-03 | Colocar avatar por selección accesible (toque, clic o teclado) | FR | Must | HU-03, HU-04 | Implementado | El avatar se coloca tocando el paisaje, con los botones de zona o con el teclado, con confirmación textual; no se implementó el arrastre |
| RF-04 | Colocación privada y revelación simultánea, anónima y automática | FR | Must | HU-05 | Implementado | Ningún avatar ajeno es visible antes de la revelación; al confirmar el último miembro se revela sin nombres; solo quien activa "Mostrar mi nombre" queda identificado |
| RF-05 | Anuncio de zona y resumen textual | FR | Must | HU-04 | Implementado | Tras la revelación, el lector de pantalla anuncia la zona y la cantidad de participantes por zona |
| RF-06 | Comentarios por voz o texto equivalentes | FR | Must | HU-06, HU-07 | Implementado | La transcripción y la escritura llenan el mismo campo; si falla la voz, se resalta la caja de texto |
| RF-07 | Vista previa anónima antes de publicar | FR | Must | HU-07 | Implementado | Nada se publica sin confirmación; la vista previa muestra el aviso de anonimato y se publica la versión editada |
| RF-08 | Publicación anónima y descarte de audio | FR | Must | HU-08 | Implementado | El comentario se publica sin autor, ID ni IP; el audio no persiste, incluso si falla la transcripción |
| RF-09 | Estados visuales y textuales sin confirmaciones falsas | FR | Must | HU-06, HU-07, HU-24 | Implementado | Se muestran "Grabando", "Procesando" y "Publicado"; ante una caída durante el envío se muestra "No se pudo confirmar" con la opción de reintentar |
| RF-10 | Lectura en voz alta (TTS) a demanda | FR | Should | HU-16 | Implementado | "Escuchar" narra los resultados; si el TTS falla, se avisa y el texto sigue accesible |
| RF-11 | Ajustes de texto, contraste, enfoque y animaciones | FR | Must | HU-09, HU-10 | Implementado | Los ajustes se aplican al instante sin recargar; el modo enfoque pausa las animaciones |
| RF-12 | Ayuda contextual por fase | FR | Must | HU-10 | Implementado | "¿Qué hago aquí?" muestra la ayuda sin cambiar de pantalla, incluso sin conexión |
| RF-13 | Perfil persistente que se actualiza con el uso | FR | Must | HU-11, HU-21 | Implementado | Las preferencias se aplican al volver; ante correcciones frecuentes se sugiere un ajuste; si se borran los datos, se usan valores por defecto con aviso |
| RF-14 | Emoción inferida confirmable | FR | Must | HU-12 | Implementado | La corrección se guarda en el perfil; si el usuario no responde, no se guarda ninguna emoción |
| RF-15 | Sincronización en tiempo real | FR | Must | HU-05, HU-13 | Implementado | La revelación, las publicaciones y los votos se reflejan en todas las pantallas |
| RF-16 | Análisis con LLM revisable antes de publicarlo | FR | Must | HU-15, HU-27 | Implementado | El equipo no ve ningún resultado hasta que el facilitador presiona "Publicar al equipo"; los cambios del borrador se reflejan en lo publicado |
| RF-17 | Temas recurrentes y evolución del paisaje | FR | Must | HU-18 | Implementado | Con 2 o más sprints se muestran tendencias; con 1 sprint se indica que no hay historial suficiente |
| RF-18 | Votación con fichas y registro de misiones | FR | Must | HU-17, HU-19 | Implementado | Nadie puede asignar más de 3 fichas; al cierre, las acciones más votadas quedan registradas como misiones del sprint |
| RF-19 | Retroalimentación afectiva con equivalente textual | FR | Must | HU-03, HU-05, HU-07, HU-17, HU-25 | Implementado | Cada evento dispara una microinteracción y un texto; con reducción de animaciones activa solo se muestra el texto |
| RF-20 | Etiquetas de razón opcionales y agregadas | FR | Should | HU-20 | Implementado | Se pueden marcar 0, 1 o 2 etiquetas; el resumen muestra solo conteos por etiqueta |
| RF-21 | Posición anterior privada y recordatorio del sprint previo | FR | Should | HU-21 | Implementado | La silueta solo aparece en la pantalla de su dueño; el recordatorio se puede saltar y no aparece en el primer sprint |
| RF-22 | Selección de zona por toque en móvil | FR | Must | HU-22 | Implementado | En un ancho de 390 px el avatar se coloca con un solo toque |
| RF-23 | Avance sin posiciones y foto anónima del sprint | FR | Should | HU-23 | Implementado | Se muestra "4 de 6 listos" sin zonas; tras la revelación, la foto aparece en la evolución sin nombres |
| RF-24 | Recuperación del dictado sin perder contenido | FR | Must | HU-24 | Implementado | Al simular un fallo de voz se ofrecen las tres opciones y el texto previo se conserva |
| RF-25 | Votación oculta con cierre automático | FR | Must | HU-17, HU-25 | Implementado | Durante la votación nadie ve totales; al confirmar el último voto se revelan los resultados en todas las pantallas |
| RF-26 | Banco de ideas congeladas | FR | Should | HU-26 | Implementado | Las acciones no adoptadas aparecen en el banco y pueden agregarse a una votación posterior |
| RF-27 | Misiones sobre el paisaje para el PO | FR | Could | HU-19 | Implementado | El resumen del sprint muestra cada misión con sus fichas y una lista equivalente para lector de pantalla |
| RF-28 | Temas explicables y marcados como sugerencia de IA | FR | Must | HU-27 | Implementado | Cada tema muestra su número de comentarios y la etiqueta "Sugerido por IA"; al abrirlo se listan los comentarios anónimos que lo originan |
| RF-29 | Agrupación manual de respaldo | FR | Should | HU-28 | Implementado | Con el proveedor desconectado, tras el aviso se completa la agrupación a mano y se continúa a la votación |
| RF-30 | Acciones propuestas por el equipo | FR | Should | HU-29 | Implementado | Las acciones agregadas muestran "Propuesta del equipo" y aparecen en la votación |
| RF-31 | Guardián del anonimato antes de publicar | FR | Must | HU-30 | Implementado | Un comentario con nombre propio y un compañero culpado muestra ambos fragmentos, la explicación y una versión alternativa; "Publicar igual" lo publica sin cambios (`npm test`) |
| RF-32 | Comentarios marcados solo para el facilitador | FR | Should | HU-31 | Implementado | El comentario publicado tras un aviso aparece marcado en el borrador y se puede ocultar y volver a incluir |
| RF-33 | Seguimiento de misiones y temas que vuelven | FR | Must | HU-32 | Implementado | Cada misión anterior muestra su estado con los comentarios de evidencia; la acción ajustada entra a la votación como "Seguimiento"; los temas recurrentes muestran sus sprints |
| RF-34 | Acta redactada con IA y revisada por el facilitador | FR | Must | HU-33 | Implementado | El borrador incluye un criterio verificable por misión, se edita, se descarga en Markdown y queda en la evolución del equipo |
| RF-35 | Eco, asistente de voz del facilitador | FR | Must | HU-34 | Implementado | Pedidos informales ejecutan la acción correcta; revelar con gente pendiente pide confirmación; las acciones fuera de fase se rechazan (`npm test`) |
| RF-36 | Vista del proyector | FR | Should | HU-35 | Implementado | La vista no recibe comentarios individuales ni votos parciales y muestra los subtítulos de Eco |
| RNF-01 | WCAG 2.2 AA, sin depender de color, mouse ni voz | NFR | Must | HU-04, HU-09 | Por validar | Auditoría automática sin errores AA y recorrido completo solo con teclado y lector de pantalla |
| RNF-02 | Flujo principal en 5 min o menos, con pasos y mensajes claros | NFR | Must | HU-10 | Por validar | En una prueba de usabilidad, un usuario nuevo completa el flujo en 5 min o menos guiado por el indicador de pasos |
| RNF-03 | Tres niveles de Norman | NFR | Must | HU-03, HU-17, HU-18 | Implementado | Visceral: paisaje, revelación y estandartes (HU-03, HU-25). Conductual: votación eficiente (HU-17). Reflexivo: evolución entre sprints (HU-18) |
| RNF-04 | Sincronización ≤ 1 s y carga < 2 s | NFR | Must | HU-13, HU-14 | Implementado | Latencia medida de eventos ≤ 1 s; carga desde caché < 2 s según Lighthouse |
| RNF-05 | PWA instalable, adaptable y con carga sin conexión | NFR | Must | HU-14, HU-22 | Implementado | El navegador ofrece instalarla y, sin conexión, carga la interfaz con el aviso de que la sala requiere conexión |
| RNF-06 | Conservar estado y avisar fallos | NFR | Must | HU-01, HU-13 | Implementado | Al simular una caída de red se muestra el aviso y, al reconectar, se restaura el estado confirmado |
| RNF-07 | Sin audio ni identificadores; LLM y logs anonimizados | NFR | Must | HU-08, HU-15 | Implementado | La revisión de la base de datos, los logs y las solicitudes al LLM muestra textos sin metadatos del autor |
| RNF-08 | HTTPS, claves protegidas, sanitización y acceso restringido | NFR | Must | HU-02, HU-07, HU-15 | Parcial | Bloqueo tras 5 intentos fallidos (HU-02); código ingresado mostrado como texto plano (HU-07); llamadas al LLM desde el servidor (HU-15); el HTTPS depende del despliegue: en la red local de la demo se usa HTTP |
| RNF-09 | Capa de abstracción del LLM y proveedor simulado | NFR | Must | HU-15 | Implementado | Cambiar de proveedor solo requiere un nuevo adaptador; el proveedor simulado se usa en pruebas y demos, nunca como resultado real ante un fallo |
