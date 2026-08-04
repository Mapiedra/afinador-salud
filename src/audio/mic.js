/**
 * Captura de microfono.
 *
 * Arranca sola al cargar la app (sin boton de inicio). Si el navegador exige
 * un gesto -Safari en iOS es el caso habitual- o el permiso esta denegado,
 * expone el estado correspondiente para que la UI muestre la capa de rescate.
 */

/** Muestras por ventana. ~170 ms a 48 kHz: dos periodos del pedal de tuba. */
export const TAMANO_VENTANA = 8192

/**
 * Estados posibles:
 *  'iniciando' | 'escuchando' | 'gesto' | 'denegado' | 'silenciado' |
 *  'sin-soporte' | 'error'
 */
export function crearMicrofono({ alCambiarEstado } = {}) {
  let contexto = null
  let analizador = null
  let flujo = null
  let fuente = null
  let ventana = new Float32Array(TAMANO_VENTANA)
  let estado = 'iniciando'
  let silenciadoPorUsuario = false

  function fijarEstado(nuevo, detalle) {
    if (estado === nuevo) return
    estado = nuevo
    alCambiarEstado?.(nuevo, detalle)
  }

  function soportado() {
    return Boolean(navigator.mediaDevices?.getUserMedia && (window.AudioContext || window.webkitAudioContext))
  }

  async function montarGrafo() {
    const Contexto = window.AudioContext || window.webkitAudioContext
    contexto = new Contexto({ latencyHint: 'interactive' })

    flujo = await navigator.mediaDevices.getUserMedia({
      audio: {
        // Imprescindible: el procesado del navegador deforma la senal y
        // arruina la precision en cents.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1
      },
      video: false
    })

    fuente = contexto.createMediaStreamSource(flujo)
    analizador = contexto.createAnalyser()
    analizador.fftSize = TAMANO_VENTANA
    analizador.smoothingTimeConstant = 0

    // Safari solo tira del grafo si llega al destino. Un gain a 0 lo garantiza
    // sin emitir nada por el altavoz (y sin realimentacion).
    const mudo = contexto.createGain()
    mudo.gain.value = 0

    fuente.connect(analizador)
    analizador.connect(mudo)
    mudo.connect(contexto.destination)

    ventana = new Float32Array(analizador.fftSize)
  }

  /**
   * Intenta arrancar. `porGesto` indica que venimos de un toque del usuario,
   * en cuyo caso Safari ya deja reanudar el contexto.
   */
  async function iniciar(porGesto = false) {
    if (!soportado()) {
      fijarEstado('sin-soporte')
      return false
    }

    try {
      if (!contexto) await montarGrafo()

      if (contexto.state === 'suspended') {
        await contexto.resume()
      }

      if (contexto.state !== 'running') {
        // Sigue bloqueado: hace falta un toque explicito.
        fijarEstado('gesto')
        return false
      }

      silenciadoPorUsuario = false
      fijarEstado('escuchando')
      return true
    } catch (error) {
      const nombre = error?.name ?? ''
      if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
        // En el primer arranque sin gesto esto puede ser solo la politica del
        // navegador; con gesto ya significa permiso denegado de verdad.
        fijarEstado(porGesto ? 'denegado' : 'gesto', error)
      } else if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
        fijarEstado('error', error)
      } else {
        fijarEstado('error', error)
      }
      return false
    }
  }

  function silenciar() {
    silenciadoPorUsuario = true
    contexto?.suspend()
    fijarEstado('silenciado')
  }

  async function alternar() {
    if (silenciadoPorUsuario || estado !== 'escuchando') {
      return iniciar(true)
    }
    silenciar()
    return false
  }

  /** Copia la ultima ventana de audio. Devuelve null si no hay captura activa. */
  function leerVentana() {
    if (!analizador || contexto?.state !== 'running') return null
    analizador.getFloatTimeDomainData(ventana)
    return ventana
  }

  // Ahorro de bateria: fuera de pantalla suspendemos, al volver reanudamos.
  document.addEventListener('visibilitychange', () => {
    if (!contexto) return
    if (document.hidden) {
      contexto.suspend()
    } else if (!silenciadoPorUsuario) {
      contexto.resume().then(
        () => fijarEstado(contexto.state === 'running' ? 'escuchando' : 'gesto'),
        () => fijarEstado('gesto')
      )
    }
  })

  return {
    iniciar,
    alternar,
    silenciar,
    leerVentana,
    get estado() {
      return estado
    },
    get frecuenciaMuestreo() {
      return contexto?.sampleRate ?? 48000
    }
  }
}
