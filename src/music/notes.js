/**
 * Teoria musical del afinador: conversion Hz <-> MIDI, desviacion en cents,
 * nombres latinos y transposicion.
 *
 * Todo son funciones puras, que es donde se concentran los errores caros de
 * un afinador. Se prueban en tests/notes.test.js sin necesidad de navegador.
 */

export const A4_POR_DEFECTO = 440
export const A4_MIN = 415
export const A4_MAX = 466

/**
 * Nombres con preferencia de bemoles: es como lee el metal (Mi♭, Si♭, La♭)
 * y evita los sostenidos, que en banda apenas se usan para nombrar notas.
 */
const NOMBRES = ['Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si']

/** Semitonos que hay que sumar al sonido real para obtener la nota escrita. */
export const TRANSPOSICIONES = {
  do: 0,
  sib: 2,
  fa: 7
}

/** Etiqueta que se muestra junto a la nota. */
export const ETIQUETAS_TONALIDAD = {
  do: 'en Do',
  sib: 'en Si♭',
  fa: 'en Fa'
}

/** Numero MIDI (con decimales) de una frecuencia. */
export function hzAMidi(hz, a4 = A4_POR_DEFECTO) {
  return 69 + 12 * Math.log2(hz / a4)
}

/** Frecuencia exacta de un numero MIDI. */
export function midiAHz(midi, a4 = A4_POR_DEFECTO) {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

/** Nombre latino y octava cientifica de un MIDI entero. */
export function nombrarMidi(midi) {
  const indice = ((midi % 12) + 12) % 12
  return {
    nombre: NOMBRES[indice],
    octava: Math.floor(midi / 12) - 1
  }
}

/**
 * Analiza una frecuencia detectada.
 *
 * @param {number} hz  Frecuencia fundamental detectada.
 * @param {number} a4  Referencia de afinacion (415-466).
 * @returns {{
 *   hz:number, midi:number, midiCercano:number, cents:number,
 *   hzIdeal:number, deltaHz:number
 * }|null}
 */
export function analizarFrecuencia(hz, a4 = A4_POR_DEFECTO) {
  if (!Number.isFinite(hz) || hz <= 0) return null

  const midi = hzAMidi(hz, a4)
  const midiCercano = Math.round(midi)
  const hzIdeal = midiAHz(midiCercano, a4)

  return {
    hz,
    midi,
    midiCercano,
    cents: 100 * (midi - midiCercano),
    hzIdeal,
    deltaHz: hz - hzIdeal
  }
}

/**
 * Nota escrita para una tonalidad de lectura dada.
 *
 * El MIDI detectado es siempre el sonido REAL (concertino, en Do). Un
 * instrumento en Si♭ escribe un tono por encima de lo que suena, y la trompa
 * en Fa una quinta justa por encima.
 *
 * @param {number} midiReal  MIDI del sonido real.
 * @param {'do'|'sib'|'fa'} tonalidad
 */
export function notaEscrita(midiReal, tonalidad) {
  const desplazamiento = TRANSPOSICIONES[tonalidad]
  if (desplazamiento === undefined) {
    throw new Error(`Tonalidad desconocida: ${tonalidad}`)
  }

  const midi = midiReal + desplazamiento
  const { nombre, octava } = nombrarMidi(midi)

  return { tonalidad, midi, nombre, octava, etiqueta: ETIQUETAS_TONALIDAD[tonalidad] }
}

/**
 * Clasifica la desviacion respecto al margen de afinacion.
 * @returns {'afinado'|'alto'|'bajo'}
 */
export function estadoAfinacion(cents, tolerancia) {
  if (Math.abs(cents) <= tolerancia) return 'afinado'
  return cents > 0 ? 'alto' : 'bajo'
}

/**
 * Cuanto hay que mover la bomba, en terminos cualitativos.
 * @returns {'nada'|'poco'|'medio'|'mucho'}
 */
export function magnitudDesviacion(cents, tolerancia) {
  const abs = Math.abs(cents)
  if (abs <= tolerancia) return 'nada'
  if (abs <= 25) return 'poco'
  if (abs <= 50) return 'medio'
  return 'mucho'
}
