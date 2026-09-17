# Changelog

Historial de cambios del Afinador Banda La Salud.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.3.0] — 2026-09-17

### Añadido

- **El trombón también se lee en Si♭**. Pasa de una sola lectura a las dos,
  como el bombardino y la tuba: en la banda hay papeles de trombón escritos en
  las dos tonalidades y con una única lectura había que transportar de cabeza.

### Cambiado

- **La trompeta muestra primero Do y después Si♭**, al revés que hasta ahora.
  Así los cinco instrumentos con doble lectura ponen el Do a la izquierda y no
  hay que fijarse en el rótulo para saber cuál se está mirando.

## [1.2.0] — 2026-08-05

### Añadido

- **Botón para instalar la app**, junto al de ajustes en la cabecera. Aparece
  salvo que ya esté instalada o que el navegador no sepa instalar aplicaciones
  web, y nunca es un callejón sin salida: si hay diálogo nativo disponible lo
  lanza, y si no —iPhone, o Chrome que aún no lo ha ofrecido— explica el gesto
  manual con los pasos del navegador correspondiente.
- **El evento `beforeinstallprompt` se captura desde el `<head>`**, antes que
  el resto del JavaScript. Chrome lo dispara una sola vez y muy pronto, así que
  hasta ahora se perdía: sin nadie que lo recogiera, la única vía era la
  barrita del propio navegador, que Chrome deja de mostrar durante meses en
  cuanto el usuario la descarta una vez. Esa es la explicación más probable de
  que la opción de instalar hubiera desaparecido.
- **Diagnóstico de instalación en Ajustes**, con botón de copiar: contexto
  seguro, soporte del evento, si llegó y a los cuántos milisegundos, si corre
  en modo app y si el service worker controla la página.

### Cambiado

- **El manifest declara `id` explícito** y `start_url` y `scope` absolutos, los
  tres derivados de la ruta base. Sin `id`, el navegador deriva la identidad de
  la app de `start_url`: si algún día cambiara la ruta, se instalaría como una
  aplicación distinta.
- **El service worker se registra también en desarrollo**, para poder probar la
  instalación en `localhost` sin desplegar. Sin `navigateFallback` a propósito:
  con él, el HTML se servía desde la caché y los cambios en `index.html` no
  aparecían hasta borrar el service worker a mano.

### Arreglado

- La hoja de ajustes crecía hasta 527 px con el bloque nuevo y en una pantalla
  baja se salía por arriba, dejando los primeros ajustes fuera de alcance.
  Ahora se limita al 88 % del alto y se desplaza por dentro.
- En pantallas de 620 px de alto o menos la tarjeta de consejo se quedaba en
  49 px y recortaba el texto, con el dibujo reducido a 20×27 px. Ahí se recorta
  el arco y se muestra solo el titular del consejo, que es la parte accionable.

## [1.1.0] — 2026-08-04

### Cambiado

- **Los seis instrumentos se redibujan en plano, de formas macizas.** Corneta,
  trompeta y trombón en horizontal; bombardino y tuba en vertical, que es como
  se sostienen y lo que permite que el dibujo aproveche el alto de la tarjeta;
  la trompa, enrollada y con la campana al lado, sale más ancha que alta y se
  apila como los tres primeros. La tuba pasa de 181×105 a 181×247 y la trompa
  de 181×136 a 251×189.
- **El arco ya no se mueve al cambiar de instrumento, y aprovecha todo el
  ancho.** El arco estaba en la fila elástica y el consejo en la de alto
  automático, así que el texto del consejo —que cambia de largo según el
  instrumento— le empujaba la posición. Ahora la nota y el arco se apilan
  arriba con su alto natural y el consejo se queda con todo el sobrante. Se le
  quita además el tope de 300 px de ancho: en una pantalla de 430 px pasa de
  300 a 398 px, y sus marcas y cifras crecen con él.
- **La tarjeta de consejo se reparte según la disposición del instrumento.**
  Los alargados (corneta, trompeta, trombón) llevan el dibujo arriba a todo lo
  ancho y el texto debajo; los que se sostienen de pie (bombardino, trompa,
  tuba) mantienen el dibujo a un lado. En un móvil de 430 px el dibujo de la
  trompeta pasa de 146×85 a 368×215. El reparto apilado solo se aplica a
  partir de 700 px de alto de pantalla: por debajo la tarjeta se queda en unos
  90 px y, apilado, el dibujo se aplastaba hasta desaparecer.
- **El selector de instrumento pasa a estar sobre el pie**, al alcance del
  pulgar.
- **Las lecturas suben al panel**, justo encima de la nota: Hz detectados,
  estado del micrófono y referencia de afinación. El pie queda para los
  créditos —versión y autor, Miguel A. Piedra—, con la versión tomada de
  `package.json` en tiempo de compilación para no mantenerla en dos sitios.
- **Ajuste de altura en pantallas bajas.** Al subir las lecturas al panel, en
  una pantalla de 640 px la tarjeta de consejo se quedaba en 56 px y recortaba
  el texto en los seis instrumentos. El arco pasa a tener un tope de ancho
  ligado al alto de la pantalla y el selector se compacta por debajo de 700 px;
  ninguna de las dos cosas afecta a pantallas normales. La tarjeta recupera
  102 px.
- **El detalle del consejo se acorta.** Antes juntaba el matiz y la ubicación
  de la pieza en un párrafo que se recortaba en pantallas de 640 px. Con el
  instrumento en los labios hace falta la dirección y cuánto, así que la
  ubicación queda solo en reposo.

- **Las dos lecturas tienen ya el mismo peso visual.** Antes la principal iba
  en grande y la otra en pequeño debajo, dentro de una píldora. Ahora van una
  al lado de la otra, con el mismo tamaño de nota y cada una con su tonalidad
  rotulada encima en un distintivo dorado, separadas por una línea. La trompa,
  con una sola lectura, ocupa el bloque centrado.
- **Corneta y trombón se leen solo en Do**, así que pasan a mostrar una única
  lectura, como la trompa con su Fa.
- Los dibujos se ven pequeños en el móvil, así que en todos ellos solo entra lo
  que se reconoce a ese tamaño: nada de aros, palometas ni bombas de pistón.
- En la trompeta, **la bomba general se solapa con la campana**, como en el
  instrumento real. Se dibuja la última para que se pinte por encima y se tiñe
  con el color de estado, así que se distingue sobre el dorado tanto parada
  como desplazándose.
- **La caja del dibujo pasa a tener tamaño fijo.** Cada instrumento tiene su
  propia proporción y el SVG se escala para caber dentro; sin esto, la tarjeta
  de consejo cambiaba de alto al cambiar de instrumento.
- **El bloque de notas ya no da saltos al cambiar de nota.** El ancho lo
  dictaba el propio texto, así que la caja pasaba de 85 px con «Si» a 133 px
  con «Sol♭» y la línea divisoria se desplazaba 28 px en cada lectura, con todo
  el bloque temblando encima del arco. Ahora el nombre reserva un ancho mínimo
  y la octava su hueco, ambos en `em` para que sigan a la tipografía. Medido:
  una sola posición para las doce notas más el marcador de reposo, con una y
  con dos lecturas, y de 360 a 430 px de ancho de pantalla.
- **El arco numera cada 10 cents** en lugar de solo −50, 0 y +50. Comprobado
  que a 300 px de ancho las once etiquetas no llegan a solaparse: quedan a unos
  27 px entre centros.
- **La corneta se afina por el tudel, no por una bomba.** Es una corneta
  española de llaves: se afina extrayendo el tudel sobre el que monta la
  boquilla. La pieza de afinación pasa a ser un dato de cada instrumento
  (`pieza`) en lugar de estar incrustada en los textos, así que el consejo dice
  «Saca el tudel» en la corneta y «Saca la bomba general» en el resto. Su SVG
  se redibuja horizontal y despojado de aros, palometas y llave: solo cuerpo,
  tudel y campana. La boquilla va dentro del grupo del tudel, porque se extraen
  juntos.
- `consejoBomba()` pasa a llamarse `consejoAjuste()`, el campo
  `ubicacionBomba` a `ubicacion` y el gancho `data-bomba` de los SVG a
  `data-ajuste`: el nombre anterior daba por hecho que todos los instrumentos
  llevan bomba.

### Añadido

- Traza de diagnóstico del arranque de audio, consultable desde la propia capa
  de permiso («Diagnóstico»). Registra cada paso —creación del contexto,
  petición de permiso, conexión del grafo, reanudación— con su marca de tiempo,
  para poder localizar dónde se detiene sin depender de la consola.

### Arreglado

- **La capa de «Activar micrófono» no se ocultaba nunca, aunque el micrófono
  estuviera funcionando.** Este era el fallo de fondo, y era de CSS, no de
  audio: `.capa` declara `display: grid`, que pisa la regla `[hidden] {
  display: none }` del navegador porque los estilos de autor ganan a los del
  agente de usuario. El código ocultaba la capa correctamente —el atributo
  `hidden` se ponía— pero seguía pintándose a pantalla completa por encima de
  la app. Se añade una regla `[hidden] { display: none !important }` global.

  El mismo defecto afectaba a `.nota__secundaria` (`display: inline-flex`), así
  que **la trompa mostraba una segunda lectura que no debía existir**,
  incumpliendo el requisito de que solo muestre Fa.

  Las verificaciones previas no lo detectaron porque comprobaban la propiedad
  `hidden` del elemento en lugar de su caja renderizada. Ahora se mide el
  `display` calculado y el rectángulo real.
- **El botón se quedaba en «Activando…» tras un arranque correcto.** En caso de
  éxito no restauraba su texto y confiaba en el aviso de cambio de estado para
  ocultar la capa; si el estado ya era `escuchando`, ese aviso no llega a
  dispararse. Ahora la oculta él mismo.
- **La hoja de ajustes ya no depende de `requestAnimationFrame`** para lanzar
  su animación de entrada. Si el navegador no está componiendo fotogramas, ese
  callback no llega y la hoja se quedaba presente pero fuera de pantalla. Se
  fuerza un reflow síncrono en su lugar.
- **El botón «Activar» se quedaba en «Activando…» para siempre.** Causa
  confirmada: `getUserMedia` era el único `await` sin acotar que quedaba, y
  mientras el diálogo de permiso sigue abierto esa promesa continúa pendiente.
  Peor aún, la pulsación del usuario **devolvía esa misma promesa encallada**
  en lugar de empezar un intento nuevo, así que el botón quedaba muerto por
  mucho que se pulsara. Arreglado en tres frentes:
  - límite de 12 s en la petición de permiso;
  - un toque del usuario siempre inicia un intento propio, sin quedar atrapado
    tras uno automático en curso;
  - límite de 15 s en la interfaz como última red de seguridad.
- **La petición de permiso se comparte en lugar de duplicarse.** Dos llamadas
  concurrentes a `getUserMedia` podían dejar un diálogo huérfano.
- **Recuperación si el permiso llega tarde.** Si se concede después de que
  venza la espera —por ejemplo desde el panel del candado en vez de desde el
  diálogo—, la app se reengancha sola en lugar de dejar la capa de permiso
  puesta. Acotado a los estados en los que realmente se ha rendido: en el
  arranque normal el estado aún es `iniciando` y reintentar ahí solo duplicaba
  el trabajo.

## [1.0.0] — Primera versión publicada

### Arreglado en el arranque del micrófono

- **`await contexto.resume()` colgaba el arranque.** Esa promesa puede quedarse
  pendiente para siempre cuando se llama sin gesto del usuario (comportamiento
  conocido de WebKit). Ahora se corre contra un límite de tiempo y después se
  consulta `state`, que es la fuente de verdad.
- **El grafo de audio quedaba a medias.** `montarGrafo()` asignaba `contexto`
  *antes* de pedir `getUserMedia`, así que un permiso fallido dejaba `contexto`
  puesto con `analizador` y `flujo` nulos. Como el reintento comprobaba
  `if (!contexto)`, no volvía a pedir el micrófono nunca más: el botón no podía
  funcionar aunque se concediera el permiso después. El montaje pasa a ser
  atómico.
- La reanudación dentro del gesto se dispara de forma síncrona, antes de
  cualquier `await`, para no perder la activación del usuario.
- Un listener de `statechange` recupera la escucha si el navegador reanuda el
  contexto por su cuenta más tarde.
- El botón de la capa de permiso da respuesta siempre: pasa a «Activando…» y,
  si el intento falla sin cambiar de estado, muestra «Reintentar» con el motivo.
  Antes la capa no se repintaba y parecía muerta.

### Añadido

- **Detección de tono** por el método de McLeod (MPM) sobre la NSDF, con
  autocorrelación calculada por FFT propia (radix-2 iterativa). La selección
  del *primer* pico que supera el 85 % del máximo —y no del más alto— es lo que
  evita los saltos de octava que provocan los armónicos del metal.
  Interpolación parabólica para precisión sub-cent.
- **Seis instrumentos**: corneta, trompeta, trombón, bombardino, trompa y tuba.
  Cada uno declara sus lecturas y su registro útil, que acota la búsqueda de la
  fundamental como segundo cortafuegos contra los errores de octava.
- **Lecturas simultáneas** sin selector de tonalidad: Do y Si♭ en todos los
  instrumentos y solo Fa en la trompa. Lo decide el instrumento elegido.
- **Consejo gráfico de bomba general**, con un SVG por instrumento y la bomba
  desplazándose en la dirección que alarga su tubo: derecha en trompeta y
  corneta, izquierda en trombón, bombardino y tuba, arriba en trompa.
- **Margen de afinación de ±10 cents** por defecto, ajustable a ±5 o ±15, con
  la desviación mostrada en cents y en Hz.
- **Referencia La4 = 440 Hz** ajustable entre 415 y 466.
- **PWA instalable y 100 % offline**: no hay ninguna petición de red en tiempo
  de ejecución, así que el precache del service worker es el modo offline
  completo. Sin backend, sin cuentas y sin analítica.
- **Wake Lock** para que la pantalla no se apague mientras se afina.
- Suite de 25 tests sobre las funciones puras, incluyendo señales sintéticas
  para el detector: seno puro con precisión sub-cent, pedal de tuba a 29 Hz y
  un timbre con la fundamental debilitada, como el de la trompa, donde un
  detector ingenuo saltaría una octava.

### Notas

- La captura de audio desactiva `echoCancellation`, `noiseSuppression` y
  `autoGainControl`: el procesado del navegador deforma la señal y arruina la
  precisión en cents.
- El icono de 512 px se reescala desde un logo original de 200×200 y queda
  ligeramente suave. Se resuelve sustituyendo `logoLaSalud.png` por una versión
  mayor y ejecutando `npm run icons`.
