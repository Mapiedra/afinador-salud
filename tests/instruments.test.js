import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  INSTRUMENTOS,
  buscarInstrumento,
  consejoBomba
} from '../src/music/instruments.js'
import { TRANSPOSICIONES } from '../src/music/notes.js'

test('estan los seis instrumentos de metal de la banda', () => {
  const ids = INSTRUMENTOS.map((i) => i.id)
  assert.deepEqual(ids, ['corneta', 'trompeta', 'trombon', 'bombardino', 'trompa', 'tuba'])
})

test('la trompa lee solo en Fa; el resto en Do y Si♭', () => {
  const lecturas = Object.fromEntries(INSTRUMENTOS.map((i) => [i.id, i.lecturas]))

  assert.deepEqual(lecturas.trompa, ['fa'])
  assert.deepEqual(lecturas.corneta, ['sib', 'do'])
  assert.deepEqual(lecturas.trompeta, ['sib', 'do'])
  assert.deepEqual(lecturas.trombon, ['do', 'sib'])
  assert.deepEqual(lecturas.bombardino, ['do', 'sib'])
  assert.deepEqual(lecturas.tuba, ['do', 'sib'])
})

test('toda lectura declarada existe en la tabla de transposiciones', () => {
  for (const instrumento of INSTRUMENTOS) {
    assert.ok(instrumento.lecturas.length >= 1, `${instrumento.id} sin lecturas`)
    for (const lectura of instrumento.lecturas) {
      assert.ok(
        lectura in TRANSPOSICIONES,
        `${instrumento.id} declara una lectura desconocida: ${lectura}`
      )
    }
  }
})

test('cada instrumento acota un registro coherente', () => {
  for (const { id, rango } of INSTRUMENTOS) {
    assert.ok(rango.minHz > 0, `${id}: minHz invalido`)
    assert.ok(rango.maxHz > rango.minHz * 2, `${id}: el rango debe cubrir al menos una octava`)
  }

  // La tuba baja mucho mas que la trompeta y la trompeta sube mucho mas que la tuba.
  const tuba = buscarInstrumento('tuba')
  const trompeta = buscarInstrumento('trompeta')
  assert.ok(tuba.rango.minHz < trompeta.rango.minHz)
  assert.ok(trompeta.rango.maxHz > tuba.rango.maxHz)
})

test('un id desconocido cae en el instrumento por defecto', () => {
  assert.equal(buscarInstrumento('flauta').id, 'trompeta')
  assert.equal(buscarInstrumento(undefined).id, 'trompeta')
})

test('mas tubo suena mas grave: alto saca la bomba, bajo la mete', () => {
  const trompeta = buscarInstrumento('trompeta')

  assert.equal(consejoBomba(trompeta, 'alto', 'poco').direccion, 'sacar')
  assert.equal(consejoBomba(trompeta, 'bajo', 'poco').direccion, 'meter')
  assert.equal(consejoBomba(trompeta, 'afinado', 'nada').direccion, 'ninguna')
})

test('el consejo apunta siempre a la bomba general, tambien en el trombon', () => {
  for (const instrumento of INSTRUMENTOS) {
    const alto = consejoBomba(instrumento, 'alto', 'medio')
    const bajo = consejoBomba(instrumento, 'bajo', 'medio')

    assert.match(alto.titulo, /bomba general/i, `${instrumento.id}: titulo inesperado`)
    assert.match(bajo.titulo, /bomba general/i, `${instrumento.id}: titulo inesperado`)
    assert.ok(alto.detalle.includes(instrumento.ubicacionBomba))
  }
})
