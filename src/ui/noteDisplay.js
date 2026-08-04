/**
 * Muestra la nota detectada en las lecturas del instrumento activo.
 *
 * Las dos lecturas tienen el MISMO peso visual: mismo tamano de nota, una al
 * lado de la otra y cada una con su tonalidad rotulada encima, para que no
 * haya duda de cual es la de Do y cual la de Si♭. La trompa solo tiene una
 * (Fa) y entonces la segunda no se pinta.
 */

import { notaEscrita } from '../music/notes.js'

const ETIQUETAS = { do: 'Do', sib: 'Si♭', fa: 'Fa' }

export function crearDisplayNota(bloques) {
  /** Pone una lectura en su bloque, o lo oculta si el instrumento no la usa. */
  function pintar(bloque, tonalidad, nota) {
    if (!tonalidad) {
      bloque.raiz.hidden = true
      return
    }

    bloque.raiz.hidden = false
    bloque.tono.textContent = ETIQUETAS[tonalidad] ?? tonalidad
    bloque.nombre.textContent = nota ? nota.nombre : '—'
    bloque.octava.textContent = nota ? String(nota.octava) : ''
  }

  return {
    /** Sin lectura fiable: se conservan las tonalidades y se vacian las notas. */
    limpiar(instrumento) {
      bloques.forEach((bloque, i) => pintar(bloque, instrumento.lecturas[i], null))
    },

    /**
     * @param {number} midiReal  MIDI del sonido real (concertino).
     * @param {object} instrumento
     */
    actualizar(midiReal, instrumento) {
      bloques.forEach((bloque, i) => {
        const tonalidad = instrumento.lecturas[i]
        pintar(bloque, tonalidad, tonalidad ? notaEscrita(midiReal, tonalidad) : null)
      })
    }
  }
}
