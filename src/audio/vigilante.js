/**
 * Vigilancia de la entrada de audio.
 *
 * Si otra aplicación se queda el micrófono -una nota de voz, una llamada, otra
 * app de música-, el navegador no siempre lo dice: la pista sigue «viva», el
 * contexto sigue en marcha y lo único que llega son ceros. El afinador
 * mostraría «Escuchando» sin oír nada.
 *
 * Un micrófono real nunca da ceros exactos: con el procesado del navegador
 * apagado siempre hay ruido de fondo, por bajo que sea. Así que una racha de
 * silencio digital es la señal de que hemos perdido la entrada.
 *
 * Aquí solo vive la política -cuándo intentar recuperar y cuándo avisar-, sin
 * nada del navegador, para poder probarla.
 */

/** Silencio digital antes de dar la entrada por perdida. */
export const LIMITE_SILENCIO_MS = 1500

/** Intentos automáticos antes de avisar al usuario. */
export const INTENTOS_ANTES_DE_AVISAR = 2

/** Una vez avisado, cada cuánto se sigue probando por si la otra app lo suelta. */
export const INTERVALO_REINTENTO_MS = 5000

/** Ceros exactos en toda la ventana. `null` (sin datos) cuenta como silencio. */
export function esSilencioDigital(muestras) {
  if (!muestras) return true
  for (let i = 0; i < muestras.length; i++) {
    if (muestras[i] !== 0) return false
  }
  return true
}

/**
 * @returns {{
 *   reiniciar(ahora: number): void,
 *   observar(haySenal: boolean, ahora: number): 'senal' | 'esperar' | 'recuperar',
 *   intentado(ahora: number): void,
 *   readonly intentos: number,
 *   readonly avisar: boolean
 * }}
 */
export function crearVigilante({
  limiteSilencioMs = LIMITE_SILENCIO_MS,
  intentosAntesDeAvisar = INTENTOS_ANTES_DE_AVISAR,
  intervaloReintentoMs = INTERVALO_REINTENTO_MS
} = {}) {
  // Desde cuándo contamos el silencio: la última señal o el último intento.
  let desde = null
  let intentos = 0

  return {
    /** Margen nuevo, p. ej. al arrancar o al volver a la app. */
    reiniciar(ahora) {
      desde = ahora
      intentos = 0
    },

    observar(haySenal, ahora) {
      if (haySenal) {
        desde = ahora
        intentos = 0
        return 'senal'
      }
      if (desde === null) {
        desde = ahora
        return 'esperar'
      }
      const espera = intentos < intentosAntesDeAvisar ? limiteSilencioMs : intervaloReintentoMs
      return ahora - desde >= espera ? 'recuperar' : 'esperar'
    },

    /** Tras un intento de recuperación, haya salido bien o no. */
    intentado(ahora) {
      intentos++
      desde = ahora
    },

    get intentos() {
      return intentos
    },

    get avisar() {
      return intentos >= intentosAntesDeAvisar
    }
  }
}
