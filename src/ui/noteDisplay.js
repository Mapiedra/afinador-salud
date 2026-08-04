/**
 * Muestra la nota detectada en las lecturas del instrumento activo.
 *
 * La primera lectura del instrumento va en grande; la segunda, debajo y en
 * pequeno. La trompa solo tiene una, asi que la secundaria queda oculta.
 */

import { notaEscrita } from '../music/notes.js'

export function crearDisplayNota(elementos) {
  const { principal, octava, tono, secundaria, secundariaNombre, secundariaTono } = elementos

  return {
    /** Sin lectura fiable: dejamos el hueco marcado pero conservamos el layout. */
    limpiar(instrumento) {
      principal.textContent = '—'
      octava.textContent = ''
      tono.textContent = etiquetaDe(instrumento.lecturas[0])
      secundaria.hidden = instrumento.lecturas.length < 2
      if (!secundaria.hidden) {
        secundariaNombre.textContent = '—'
        secundariaTono.textContent = etiquetaDe(instrumento.lecturas[1])
      }
    },

    /**
     * @param {number} midiReal  MIDI del sonido real (concertino).
     * @param {object} instrumento
     */
    actualizar(midiReal, instrumento) {
      const [primera, segunda] = instrumento.lecturas

      const uno = notaEscrita(midiReal, primera)
      principal.textContent = uno.nombre
      octava.textContent = String(uno.octava)
      tono.textContent = uno.etiqueta

      if (segunda) {
        const dos = notaEscrita(midiReal, segunda)
        secundaria.hidden = false
        secundariaNombre.textContent = `${dos.nombre}${dos.octava}`
        secundariaTono.textContent = dos.etiqueta
      } else {
        secundaria.hidden = true
      }
    }
  }
}

function etiquetaDe(tonalidad) {
  return { do: 'en Do', sib: 'en Si♭', fa: 'en Fa' }[tonalidad] ?? ''
}
