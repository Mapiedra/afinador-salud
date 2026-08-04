/**
 * Captura de microfono.
 *
 * Arranca sola al cargar la app (sin boton de inicio). Si el navegador exige
 * un gesto -Safari en iOS es el caso habitual- o el permiso esta denegado,
 * expone el estado correspondiente para que la UI muestre la capa de rescate.
 *
 * Tres cosas que hay que tratar con cuidado y que cuelgan los afinadores web:
 *
 *  1. `AudioContext.resume()` puede quedarse pendiente PARA SIEMPRE si se
 *     llama sin gesto del usuario (WebKit). Si se espera esa promesa sin mas,
 *     el arranque se cuelga y el boton de reintento deja de responder.
 *  2. `getUserMedia` tampoco tiene por que responder nunca: mientras el
 *     dialogo de permiso este abierto la promesa sigue pendiente, y si el
 *     usuario lo ignora y concede el permiso mas tarde desde el panel del
 *     candado, esa promesa original puede no resolverse jamas.
 *  3. Un intento en curso no debe bloquear a uno provocado por un toque del
 *     usuario. Si el primero esta encallado, el boton quedaria muerto.
 *
 * Por eso todo lo que espera al usuario o al navegador va contra un limite de
 * tiempo, y despues se consulta el estado real en lugar de fiarse de la
 * promesa.
 */

/** Muestras por ventana. ~170 ms a 48 kHz: dos periodos del pedal de tuba. */
export const TAMANO_VENTANA = 8192

/** Margen para que `resume()` haga efecto antes de darlo por bloqueado. */
const LIMITE_REANUDAR_MS = 1500

/** Margen para que el usuario conteste al dialogo de permiso. */
const LIMITE_PERMISO_MS = 12000

/** Pasos de arranque que se conservan para el diagnostico. */
const MAX_TRAZA = 16

/** Estados en los que ya nos hemos rendido y procede reintentar solos. */
const ESTADOS_RENDIDO = new Set(['gesto', 'denegado', 'error'])

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
  let peticionFlujo = null
  let ventana = new Float32Array(TAMANO_VENTANA)
  let estado = 'iniciando'
  let silenciadoPorUsuario = false
  let enCurso = null
  let generacion = 0
  let ultimoMotivo = null

  const traza = []
  const t0 = performance.now()

  function anotar(paso) {
    traza.push(`+${Math.round(performance.now() - t0)}ms ${paso}`)
    if (traza.length > MAX_TRAZA) traza.shift()
  }

  function fijarEstado(nuevo, motivo = null) {
    ultimoMotivo = motivo
    anotar(`estado: ${nuevo}${motivo ? ` (${motivo})` : ''}`)
    if (estado === nuevo) return
    estado = nuevo
    alCambiarEstado?.(nuevo, motivo)
  }

  function soportado() {
    return Boolean(
      navigator.mediaDevices?.getUserMedia && (window.AudioContext || window.webkitAudioContext)
    )
  }

  /** Corre `promesa` contra un limite de tiempo. Al vencer, lanza TimeoutError. */
  function conTiempo(promesa, ms, etiqueta) {
    let temporizador
    const limite = new Promise((_, fallar) => {
      temporizador = setTimeout(() => {
        const error = new Error(etiqueta)
        error.name = 'TimeoutError'
        error.etiqueta = etiqueta
        fallar(error)
      }, ms)
    })
    return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador))
  }

  function asegurarContexto() {
    if (contexto && contexto.state !== 'closed') return contexto

    const Contexto = window.AudioContext || window.webkitAudioContext
    contexto = new Contexto({ latencyHint: 'interactive' })
    anotar(`contexto creado (${contexto.state}, ${contexto.sampleRate} Hz)`)

    // Si el navegador reanuda por su cuenta mas tarde, que la UI se entere.
    contexto.addEventListener?.('statechange', () => {
      anotar(`contexto -> ${contexto.state}`)
      if (contexto.state === 'running' && analizador && !silenciadoPorUsuario) {
        fijarEstado('escuchando')
      }
    })

    return contexto
  }

  /**
   * Peticion de permiso compartida: dos llamadas concurrentes reutilizan la
   * misma promesa en lugar de abrir un segundo dialogo.
   */
  function pedirFlujo() {
    if (peticionFlujo) return peticionFlujo

    anotar('pidiendo permiso de microfono')
    peticionFlujo = navigator.mediaDevices
      .getUserMedia({
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
      .then((nuevo) => {
        anotar('permiso concedido, flujo activo')
        flujo = nuevo
        // Flujo nuevo: hay que rehacer la entrada del grafo.
        fuente?.disconnect()
        fuente = null

        // El usuario puede haber contestado al dialogo despues de que
        // venciera nuestra espera. Solo entonces reintentamos solos, en vez de
        // dejarlo mirando la capa de permiso. En el arranque normal el estado
        // todavia es 'iniciando' y el intento en curso ya sigue su camino:
        // reintentar ahi solo duplicaria el trabajo.
        if (ESTADOS_RENDIDO.has(estado) && !silenciadoPorUsuario) {
          anotar('permiso tardio: reintentando solo')
          queueMicrotask(() => iniciar(false))
        }

        return nuevo
      })
      .catch((error) => {
        anotar(`permiso fallido: ${error?.name ?? error}`)
        throw error
      })
      .finally(() => {
        peticionFlujo = null
      })

    return peticionFlujo
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
    anotar('grafo conectado')
  }

  /** Suelta el grafo y el flujo para que el siguiente intento empiece limpio. */
  function desmontar() {
    fuente?.disconnect()
    fuente = null
    analizador = null
    for (const pista of flujo?.getTracks() ?? []) pista.stop()
    flujo = null
    anotar('grafo desmontado')
  }

  /**
   * Reanuda el contexto sin quedarse colgado si la promesa nunca se resuelve.
   * @returns {Promise<boolean>} si el contexto quedo realmente en marcha.
   */
  async function reanudar() {
    if (!contexto) return false
    if (contexto.state === 'running') return true

    anotar(`reanudando desde ${contexto.state}`)
    try {
      await conTiempo(contexto.resume(), LIMITE_REANUDAR_MS, 'resume-sin-respuesta')
    } catch (error) {
      anotar(`resume: ${error?.name ?? error}`)
    }

    // `state` es la fuente de verdad, no la promesa.
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

    anotar(`iniciar(${porGesto ? 'gesto' : 'automatico'})`)

    // Lo primero y de forma SINCRONA, para no perder la activacion del
    // usuario: cualquier `await` previo haria que el navegador ya no considere
    // que estamos dentro del gesto.
    if (porGesto) {
      silenciadoPorUsuario = false
      try {
        asegurarContexto().resume?.()?.catch?.(() => {})
      } catch (error) {
        anotar(`resume sincrono fallido: ${error?.name ?? error}`)
      }
    }

    // Un intento automatico encallado no puede secuestrar al del usuario.
    if (enCurso && !porGesto) return enCurso

    const gen = ++generacion

    const intento = (async () => {
      try {
        asegurarContexto()

        if (!flujo?.active) {
          await conTiempo(pedirFlujo(), LIMITE_PERMISO_MS, 'permiso-sin-respuesta')
        }

        conectar()

        if (!(await reanudar())) {
          fijarEstado('gesto', 'contexto-suspendido')
          return false
        }

        silenciadoPorUsuario = false
        fijarEstado('escuchando')
        return true
      } catch (error) {
        const nombre = error?.name ?? 'Error'

        if (nombre === 'TimeoutError') {
          // La peticion puede seguir viva: no tocamos el grafo, que si el
          // usuario contesta tarde se recupera solo.
          fijarEstado('gesto', error.etiqueta ?? 'sin-respuesta')
          return false
        }

        // Deshacemos lo montado para que el siguiente intento vuelva a pedir
        // permiso en lugar de darse por montado y quedarse mudo.
        desmontar()

        if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
          fijarEstado(porGesto ? 'denegado' : 'gesto', nombre)
        } else {
          fijarEstado('error', nombre)
        }
        return false
      } finally {
        if (gen === generacion) enCurso = null
      }
    })()

    enCurso = intento
    return intento
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
    /** Traza de arranque, para el bloque de diagnostico de la capa. */
    get traza() {
      return [...traza]
    },
    get diagnostico() {
      return {
        estado,
        motivo: ultimoMotivo,
        contexto: contexto?.state ?? 'sin contexto',
        frecuenciaMuestreo: contexto?.sampleRate ?? null,
        flujoActivo: Boolean(flujo?.active),
        pistas: flujo?.getAudioTracks?.().map((p) => `${p.label || 'sin nombre'}: ${p.readyState}`) ?? [],
        grafo: Boolean(analizador && fuente)
      }
    },
    get frecuenciaMuestreo() {
      return contexto?.sampleRate ?? 48000
    }
  }
}
