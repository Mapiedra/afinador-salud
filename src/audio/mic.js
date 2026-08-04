/**
 * Captura de microfono.
 *
 * Arranca sola al cargar la app (sin boton de inicio). Si el navegador exige
 * un gesto -Safari en iOS es el caso habitual- o el permiso esta denegado,
 * expone el estado correspondiente para que la UI muestre la capa de rescate.
 *
 * Dos cosas que hay que tratar con cuidado y que rompen los afinadores web:
 *
 *  1. `AudioContext.resume()` puede quedarse pendiente PARA SIEMPRE si se
 *     llama sin gesto del usuario (WebKit). Si se espera esa promesa sin mas,
 *     el arranque se cuelga y el boton de reintento deja de responder. Aqui se
 *     corre contra un limite de tiempo y despues se consulta `state`.
 *  2. El grafo se monta de forma atomica: si falla getUserMedia, se deshace lo
 *     construido para que el siguiente intento vuelva a pedir permiso de
 *     verdad, en lugar de darse por montado y quedarse mudo.
 */

/** Muestras por ventana. ~170 ms a 48 kHz: dos periodos del pedal de tuba. */
export const TAMANO_VENTANA = 8192

/** Margen para que `resume()` haga efecto antes de darlo por bloqueado. */
const LIMITE_REANUDAR_MS = 1200

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
  let enCurso = null
  let ultimoMotivo = null

  function fijarEstado(nuevo, motivo = null) {
    ultimoMotivo = motivo
    if (estado === nuevo) return
    estado = nuevo
    alCambiarEstado?.(nuevo, motivo)
  }

  function soportado() {
    return Boolean(
      navigator.mediaDevices?.getUserMedia && (window.AudioContext || window.webkitAudioContext)
    )
  }

  function asegurarContexto() {
    if (contexto && contexto.state !== 'closed') return contexto
    const Contexto = window.AudioContext || window.webkitAudioContext
    contexto = new Contexto({ latencyHint: 'interactive' })
    // Si el navegador suspende o reanuda por su cuenta, que la UI se entere.
    contexto.addEventListener?.('statechange', () => {
      if (contexto.state === 'running' && analizador && !silenciadoPorUsuario) {
        fijarEstado('escuchando')
      }
    })
    return contexto
  }

  async function asegurarFlujo() {
    if (flujo?.active) return flujo
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
    // Flujo nuevo: hay que rehacer la entrada del grafo.
    fuente?.disconnect()
    fuente = null
    return flujo
  }

  function conectar() {
    if (fuente && analizador) return

    fuente = contexto.createMediaStreamSource(flujo)

    if (!analizador) {
      analizador = contexto.createAnalyser()
      analizador.fftSize = TAMANO_VENTANA
      analizador.smoothingTimeConstant = 0

      // Safari solo tira del grafo si llega al destino. Un gain a 0 lo
      // garantiza sin emitir nada por el altavoz (y sin realimentacion).
      const mudo = contexto.createGain()
      mudo.gain.value = 0
      analizador.connect(mudo)
      mudo.connect(contexto.destination)

      ventana = new Float32Array(analizador.fftSize)
    }

    fuente.connect(analizador)
  }

  function desmontar() {
    fuente?.disconnect()
    fuente = null
    analizador = null
    for (const pista of flujo?.getTracks() ?? []) pista.stop()
    flujo = null
  }

  /**
   * Reanuda el contexto sin quedarse colgado si la promesa nunca se resuelve.
   * @returns {Promise<boolean>} si el contexto quedo realmente en marcha.
   */
  async function reanudar() {
    if (!contexto || contexto.state === 'running') return contexto?.state === 'running'

    await Promise.race([
      contexto.resume().catch(() => {}),
      new Promise((listo) => setTimeout(listo, LIMITE_REANUDAR_MS))
    ])

    return contexto.state === 'running'
  }

  /**
   * Intenta arrancar la escucha.
   * @param {boolean} porGesto  Si venimos de un toque del usuario. Con gesto,
   *   un permiso denegado ya es definitivo; sin gesto puede ser solo la
   *   politica de autoreproduccion del navegador.
   */
  function iniciar(porGesto = false) {
    if (!soportado()) {
      fijarEstado('sin-soporte')
      return Promise.resolve(false)
    }

    // Lo primero y de forma SINCRONA, para no perder la activacion del usuario:
    // cualquier `await` previo haria que el navegador ya no considere que
    // estamos dentro del gesto.
    if (porGesto) {
      silenciadoPorUsuario = false
      asegurarContexto().resume?.().catch(() => {})
    }

    if (enCurso) return enCurso

    enCurso = (async () => {
      try {
        asegurarContexto()
        await asegurarFlujo()
        conectar()

        if (!(await reanudar())) {
          // El audio sigue bloqueado: hace falta un toque explicito.
          fijarEstado('gesto', 'contexto-suspendido')
          return false
        }

        silenciadoPorUsuario = false
        fijarEstado('escuchando')
        return true
      } catch (error) {
        // Deshacemos lo montado para que el siguiente intento vuelva a pedir
        // permiso en lugar de darse por montado y quedarse mudo.
        desmontar()

        const nombre = error?.name ?? 'Error'
        if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
          fijarEstado(porGesto ? 'denegado' : 'gesto', nombre)
        } else {
          fijarEstado('error', nombre)
        }
        return false
      } finally {
        enCurso = null
      }
    })()

    return enCurso
  }

  function silenciar() {
    silenciadoPorUsuario = true
    contexto?.suspend()
    fijarEstado('silenciado')
  }

  function alternar() {
    if (estado === 'escuchando' && !silenciadoPorUsuario) {
      silenciar()
      return Promise.resolve(false)
    }
    return iniciar(true)
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
      reanudar().then((activo) => {
        if (activo && analizador) fijarEstado('escuchando')
        else fijarEstado('gesto', 'contexto-suspendido')
      })
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
    /** Ultimo motivo de fallo, para poder mostrar algo concreto en la UI. */
    get motivo() {
      return ultimoMotivo
    },
    get frecuenciaMuestreo() {
      return contexto?.sampleRate ?? 48000
    }
  }
}
