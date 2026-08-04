/**
 * Tarjeta de consejo de afinacion: dibujo del instrumento con su pieza movil
 * desplazada en la direccion correcta, mas el texto.
 *
 * Cada SVG declara en su raiz un vector `--eje-x` / `--eje-y` que apunta hacia
 * donde ALARGA su pieza de afinacion: la bomba general en casi todos, y el
 * tudel en la corneta espanola de llaves, que no lleva bomba. Aqui solo se
 * fija `--desp`, positivo para sacar y negativo para meter, y el CSS resuelve
 * la direccion.
 */

import { consejoAjuste } from '../music/instruments.js'
import { DIBUJOS } from './drawings.js'

/** Recorrido del dibujo en unidades del viewBox, por magnitud de desviacion. */
const RECORRIDO = { nada: 0, poco: 5, medio: 9, mucho: 14 }

export function crearConsejo({ contenedor, dibujo, titulo, detalle }) {
  let instrumentoActual = null

  function pintarInstrumento(instrumento) {
    if (instrumentoActual === instrumento.id) return
    instrumentoActual = instrumento.id
    dibujo.innerHTML = DIBUJOS[instrumento.id] ?? ''
    // Decide el reparto de la tarjeta: dibujo arriba o dibujo al lado.
    contenedor.dataset.orientacion = instrumento.orientacion
  }

  return {
    /** Estado de reposo: dibujo centrado y mensaje de invitacion. */
    reposo(instrumento, mensaje = 'Toca una nota') {
      pintarInstrumento(instrumento)
      contenedor.dataset.direccion = 'ninguna'
      contenedor.style.setProperty('--desp', '0px')
      titulo.textContent = mensaje
      detalle.textContent = `Te diré si meter o sacar ${instrumento.pieza}. ${instrumento.ubicacion}`
    },

    /**
     * @param {object} instrumento
     * @param {'afinado'|'alto'|'bajo'} estado
     * @param {'nada'|'poco'|'medio'|'mucho'} magnitud
     */
    actualizar(instrumento, estado, magnitud) {
      pintarInstrumento(instrumento)

      const { direccion, titulo: t, detalle: d } = consejoAjuste(instrumento, estado, magnitud)
      const recorrido = RECORRIDO[magnitud] ?? 0
      // Positivo alarga el tubo (sacar), negativo lo acorta (meter).
      const desplazamiento = direccion === 'sacar' ? recorrido : direccion === 'meter' ? -recorrido : 0

      contenedor.dataset.direccion = direccion
      contenedor.style.setProperty('--desp', `${desplazamiento}px`)
      titulo.textContent = t
      detalle.textContent = d
    }
  }
}
