# Afinador Banda La Salud

Afinador de instrumentos de viento metal para la Banda La Salud (Córdoba). PWA
instalable en el móvil que **funciona entera sin conexión**: la detección de
tono ocurre en el propio dispositivo y la app no hace ninguna petición de red
en tiempo de ejecución.

**Instrumentos**: corneta, trompeta, trombón, bombardino, trompa y tuba.

## Qué hace

- Detecta la nota tocada por el micrófono y la muestra en las lecturas del
  instrumento seleccionado: **Do y Si♭** en todos, y **solo Fa** en la trompa.
  No hay selector de tonalidad; lo decide el instrumento.
- Muestra la desviación en **cents** y en **Hz** respecto a la nota ideal, con
  un margen de afinación de **±10 cents** por defecto (configurable a ±5 o ±15).
- Indica gráficamente si hay que **meter o sacar** la pieza de afinación, sobre
  un dibujo del instrumento concreto y con la magnitud del ajuste. La pieza es
  la **bomba general** en casi todos y **el tudel** en la corneta española de
  llaves, que no lleva bomba.
- Referencia de afinación **La4 = 440 Hz** por defecto, ajustable de 415 a 466.
- El micrófono **arranca solo** al abrir la app, sin botón de inicio.

## Desarrollo

```bash
npm install
```

```bash
npm run dev
```

El servidor abre en `http://localhost:5173/afinador-salud/` (Vite redirige
solo desde la raíz). El micrófono necesita `localhost` o HTTPS: desde el móvil
por IP de red local **no funcionará** sin un túnel HTTPS.

```bash
npm test
```

Cubre la teoría musical, la tabla de instrumentos y el detector de tono con
señales sintéticas: seno puro con precisión sub-cent, pedal de tuba a 29 Hz y
—el caso que justifica el algoritmo— un timbre con la **fundamental debilitada**
como el de la trompa, donde un detector ingenuo saltaría una octava.

### Comprobar el modo offline

```bash
npm run build && npm run preview
```

En DevTools → Application: confirmar el service worker activo y el precache.
Después, marcar **Offline** y recargar: la app debe funcionar entera.

### Iconos

```bash
npm run icons
```

Genera los iconos de la PWA a partir de `logoLaSalud.png`. El original mide
200×200, así que el icono de 512 se reescala hacia arriba y queda ligeramente
suave; si aparece el logo en vectorial o a mayor resolución, basta sustituir el
fichero y volver a ejecutarlo.

## Despliegue

> **Antes del primer despliegue, una sola vez:** en el repositorio, **Settings →
> Pages → Build and deployment → Source: `GitHub Actions`**.
>
> Sin ese paso el workflow falla en `configure-pages` con
> `Get Pages site failed … Error: Not Found`. No se puede automatizar: el
> parámetro `enablement` de la action exige un token personal (PAT), y el
> `GITHUB_TOKEN` del workflow no basta. Después de activarlo, relanzar el
> workflow fallido con **Re-run jobs**.

Hecho eso, cada push a `main` publica vía `.github/workflows/deploy.yml` en:

    https://mapiedra.github.io/afinador-salud/

El `base` de Vite está fijado a `/afinador-salud/`. Para desplegar en otra ruta
o en un dominio propio, sobreescribir con la variable de entorno `BASE_PATH`.

## Cómo funciona la detección

El registro va del pedal Si♭0 de la tuba (~29 Hz) al Do6 de trompeta (~1047 Hz)
y los metales tienen armónicos muy fuertes, con la fundamental a veces más débil
que el segundo armónico. Por eso se usa el **método de McLeod (MPM)** sobre la
NSDF en lugar de una autocorrelación simple:

1. Ventana de 8192 muestras (~170 ms a 48 kHz, dos periodos del pedal más grave).
2. Puerta de nivel por RMS y eliminación de la componente continua.
3. Autocorrelación por FFT (`src/audio/fft.js`) y normalización a NSDF.
4. Selección del **primer** pico que supere el 85 % del máximo — no del más
   alto: es lo que evita el salto de octava.
5. Interpolación parabólica para precisión sub-cent.
6. Segundo cortafuegos: el registro declarado por el instrumento activo.

La lectura se suaviza con mediana de 5 muestras más filtro exponencial, con
reenganche inmediato cuando el salto es un cambio de nota real.

## Estructura

```
src/
  audio/    fft.js · pitch.js (MPM) · mic.js
  music/    notes.js (Hz↔MIDI, cents, transposición) · instruments.js
  ui/       needle.js · noteDisplay.js · slideAdvice.js · settings.js
            instrumentPicker.js · drawings.js
  assets/instruments/   los 6 SVG, cada uno con su grupo [data-bomba]
tests/      node --test, sobre las funciones puras
```

`music/instruments.js` es JavaScript puro a propósito —los SVG viven en
`ui/drawings.js`— para poder probarlo sin navegador.

## Privacidad

No hay backend, ni cuentas, ni analítica. El audio no sale nunca del
dispositivo y lo único que se guarda es el instrumento elegido, la referencia
de afinación y el margen, en `localStorage`.
