/**
 * Decide en que situacion esta la instalacion de la PWA.
 *
 * JavaScript puro a proposito -sin tocar `window`- para poder probarlo con
 * `node --test`. El cableado con el navegador vive en pwa/instalacion.js.
 */

/**
 * Estados posibles:
 *
 *  'instalada'     Ya esta instalada, o la estamos ejecutando instalada.
 *  'disponible'    El navegador ha ofrecido instalarla y tenemos el evento
 *                  guardado: podemos lanzar el dialogo cuando queramos.
 *  'ios'           Safari en iOS nunca dispara el evento; hay que explicar el
 *                  gesto manual de Compartir -> Anadir a pantalla de inicio.
 *  'no-soportado'  El navegador no implementa instalacion de PWA.
 *  'esperando'     Soporta instalacion pero el evento aun no ha llegado. Es lo
 *                  normal los primeros segundos, y tambien si el navegador ya
 *                  la considera instalada o no cumple algun criterio.
 */
export function decidirEstado({
  standalone = false,
  instalada = false,
  evento = null,
  esIOS = false,
  soportaEvento = false
} = {}) {
  if (standalone || instalada) return 'instalada'
  if (evento) return 'disponible'
  if (esIOS) return 'ios'
  if (!soportaEvento) return 'no-soportado'
  return 'esperando'
}

/** Solo en 'disponible' hay un dialogo nativo que lanzar. */
export function puedeLanzarDialogo(estado) {
  return estado === 'disponible'
}

/**
 * Cuando no hay dialogo que lanzar, explicamos el gesto manual.
 *
 * Pasa en iOS, que nunca lo dispara, y tambien en Chrome cuando el evento no
 * ha llegado o ya se consumio: solo lo entrega una vez, asi que tras rechazar
 * el dialogo no se puede repetir. Sin esto el boton seria un callejon sin
 * salida.
 */
export function debeMostrarInstrucciones(estado) {
  return estado === 'ios' || estado === 'esperando'
}

/**
 * El boton se muestra siempre que quede algo que ofrecer: solo estorba si ya
 * esta instalada o si el navegador no sabe instalar aplicaciones web.
 */
export function debeMostrarBoton(estado) {
  return estado !== 'instalada' && estado !== 'no-soportado'
}

/**
 * iOS y iPadOS. El iPad moderno se anuncia como Macintosh, asi que hay que
 * mirar tambien si el dispositivo es tactil.
 */
export function esDispositivoIOS(userAgent = '', puntosTactiles = 0) {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && puntosTactiles > 1
}

const EXPLICACIONES = {
  instalada: 'Ya está instalada en este dispositivo.',
  disponible: 'Se puede instalar: usa el botón de la cabecera.',
  ios: 'En iPhone y iPad se añade a mano: Compartir → Añadir a pantalla de inicio.',
  'no-soportado': 'Este navegador no permite instalar aplicaciones web.',
  esperando:
    'El navegador todavía no la ha ofrecido. Suele tardar unos segundos; si no aparece, puede que ya esté instalada o que la hayas descartado antes.'
}

export function explicarEstado(estado) {
  return EXPLICACIONES[estado] ?? EXPLICACIONES.esperando
}
