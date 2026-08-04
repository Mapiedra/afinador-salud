import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  analizarFrecuencia,
  estadoAfinacion,
  hzAMidi,
  magnitudDesviacion,
  midiAHz,
  nombrarMidi,
  notaEscrita
} from '../src/music/notes.js'

test('440 Hz con A4=440 es La4 exacto', () => {
  const a = analizarFrecuencia(440, 440)
  assert.equal(a.midiCercano, 69)
  assert.ok(Math.abs(a.cents) < 1e-9)
  assert.ok(Math.abs(a.deltaHz) < 1e-9)

  const { nombre, octava } = nombrarMidi(a.midiCercano)
  assert.equal(nombre, 'La')
  assert.equal(octava, 4)
})

test('las tres lecturas del La4 concertino', () => {
  const midiReal = 69

  const enDo = notaEscrita(midiReal, 'do')
  assert.equal(enDo.nombre, 'La')
  assert.equal(enDo.octava, 4)

  // Un instrumento en Si♭ escribe un tono por encima de lo que suena.
  const enSib = notaEscrita(midiReal, 'sib')
  assert.equal(enSib.nombre, 'Si')
  assert.equal(enSib.octava, 4)

  // La trompa en Fa escribe una quinta justa por encima.
  const enFa = notaEscrita(midiReal, 'fa')
  assert.equal(enFa.nombre, 'Mi')
  assert.equal(enFa.octava, 5)
})

test('la transposicion cruza correctamente de octava', () => {
  // Si♭3 real (midi 58) leido en Si♭ es Do4.
  const enSib = notaEscrita(58, 'sib')
  assert.equal(enSib.nombre, 'Do')
  assert.equal(enSib.octava, 4)

  // Fa3 real (midi 53) leido en Fa es Do4.
  const enFa = notaEscrita(53, 'fa')
  assert.equal(enFa.nombre, 'Do')
  assert.equal(enFa.octava, 4)
})

test('se nombran con bemoles, no con sostenidos', () => {
  assert.equal(nombrarMidi(58).nombre, 'Si♭')
  assert.equal(nombrarMidi(63).nombre, 'Mi♭')
  assert.equal(nombrarMidi(68).nombre, 'La♭')
})

test('subir la referencia a 442 desplaza la nota ideal', () => {
  const a442 = analizarFrecuencia(440, 442)
  assert.equal(a442.midiCercano, 69)
  assert.ok(a442.cents < -7 && a442.cents > -9, `cents fuera de lo esperado: ${a442.cents}`)
  assert.ok(Math.abs(a442.hzIdeal - 442) < 1e-9)
  assert.ok(Math.abs(a442.deltaHz + 2) < 1e-9)
})

test('un semitono son 100 cents y una octava el doble de frecuencia', () => {
  assert.ok(Math.abs(hzAMidi(880, 440) - 81) < 1e-9)
  assert.ok(Math.abs(midiAHz(81, 440) - 880) < 1e-9)

  const medio = analizarFrecuencia(midiAHz(69.5, 440), 440)
  assert.ok(Math.abs(Math.abs(medio.cents) - 50) < 1e-6)
})

test('el margen de afinacion clasifica alto, bajo y afinado', () => {
  assert.equal(estadoAfinacion(0, 10), 'afinado')
  assert.equal(estadoAfinacion(10, 10), 'afinado')
  assert.equal(estadoAfinacion(-10, 10), 'afinado')
  assert.equal(estadoAfinacion(11, 10), 'alto')
  assert.equal(estadoAfinacion(-11, 10), 'bajo')

  // Con margen mas estrecho, la misma desviacion ya no pasa.
  assert.equal(estadoAfinacion(7, 5), 'alto')
})

test('la magnitud gradua cuanto hay que mover la bomba', () => {
  assert.equal(magnitudDesviacion(4, 10), 'nada')
  assert.equal(magnitudDesviacion(-18, 10), 'poco')
  assert.equal(magnitudDesviacion(40, 10), 'medio')
  assert.equal(magnitudDesviacion(-70, 10), 'mucho')
})

test('una frecuencia invalida no revienta', () => {
  assert.equal(analizarFrecuencia(0, 440), null)
  assert.equal(analizarFrecuencia(NaN, 440), null)
  assert.equal(analizarFrecuencia(-100, 440), null)
})
