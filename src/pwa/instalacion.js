/**
 * Instalacion de la PWA: boton propio en lugar de depender del aviso del
 * navegador.
 *
 * Chrome dispara `beforeinstallprompt` UNA vez y muy pronto, a veces antes de
 * que cargue este modulo. Por eso el evento se captura desde un script inline
 * en el <head> (ver index.html) y aqui solo se recoge lo que aquel dejo en
 * `window.__instalacion`. Ademas, si nadie llama a `preventDefault()`, Chrome
 * ensena su propia barrita, y si el usuario la descarta la suprime durante
 * meses: capturarla nosotros evita quedarnos sin ninguna via de instalacion.
 */

import {
  debeMostrarBoton,
  decidirEstado,
  esDispositivoIOS,
  explicarEstado,
  puedeLanzarDialogo
} from './estadoInstalacion.js'

export function crearInstalacion({ alCambiar } = {}) {
  const puente = window.__instalacion ?? { evento: null, instalada: false, msEvento: null }
  let ultimaRespuesta = null

  const esIOS = esDispositivoIOS(navigator.userAgent, navigator.maxTouchPoints ?? 0)
  const soportaEvento = 'onbeforeinstallprompt' in window

  function enStandalone() {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
      // Safari en iOS no implementa display-mode y usa esta propiedad suya.
      navigator.standalone === true
    )
  }

  function estado() {
    return decidirEstado({
      standalone: enStandalone(),
      instalada: puente.instalada,
      evento: puente.evento,
      esIOS,
      soportaEvento
    })
  }

  function avisar() {
    alCambiar?.(estado())
  }

  window.addEventListener('instalacion:disponible', avisar)
  window.addEventListener('instalacion:instalada', avisar)

  return {
    estado,
    esIOS,

    /**
     * Lanza el dialogo nativo. Devuelve 'accepted', 'dismissed' o null si no
     * habia nada que lanzar.
     */
    async instalar() {
      if (!puedeLanzarDialogo(estado())) return null

      const evento = puente.evento
      // El evento solo sirve una vez: se suelta antes de esperar la respuesta
      // para no dejarlo colgado si el usuario cancela.
      puente.evento = null

      try {
        evento.prompt()
        const { outcome } = await evento.userChoice
        ultimaRespuesta = outcome
        // Aceptar es suficiente: `appinstalled` puede tardar o no llegar, y
        // sin esto la interfaz volvería a decir que aún no se ha ofrecido.
        if (outcome === 'accepted') puente.instalada = true
        avisar()
        return outcome
      } catch (error) {
        ultimaRespuesta = `error: ${error?.name ?? error}`
        avisar()
        return null
      }
    },

    /** Datos para el bloque de diagnóstico de los ajustes. */
    diagnostico() {
      const actual = estado()
      return {
        estado: actual,
        explicacion: explicarEstado(actual),
        lineas: [
          `estado: ${actual}`,
          `contexto seguro: ${window.isSecureContext ? 'sí' : 'NO'}`,
          `soporta el evento: ${soportaEvento ? 'sí' : 'no'}`,
          `evento recibido: ${puente.evento ? `sí, a los ${puente.msEvento} ms` : puente.msEvento ? `sí, a los ${puente.msEvento} ms (ya usado)` : 'no'}`,
          `en modo app: ${enStandalone() ? 'sí' : 'no'}`,
          `instalada en esta sesión: ${puente.instalada ? 'sí' : 'no'}`,
          `iOS: ${esIOS ? 'sí' : 'no'}`,
          `service worker: ${navigator.serviceWorker?.controller ? 'controlando' : 'sin controlar'}`,
          `última respuesta: ${ultimaRespuesta ?? '—'}`,
          `pantalla: ${window.innerWidth}×${window.innerHeight}`
        ]
      }
    },

    debeMostrarBoton() {
      return debeMostrarBoton(estado())
    }
  }
}
