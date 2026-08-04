import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  INSTRUMENTOS,
  buscarInstrumento,
  consejoAjuste
} from '../src/music/instruments.js'
import { TRANSPOSICIONES } from '../src/music/notes.js'

test('estan los seis instrumentos de metal de la banda', () => {
  const ids = INSTRUMENTOS.map((i) => i.id)
  assert.deepEqual(ids, ['corneta', 'trompeta', 'trombon', 'bombardino', 'trompa', 'tuba'])
})

test('corneta, trombón y trompa llevan lectura única; el resto Do y Si♭', () => {
  const lecturas = Object.fromEntries(INSTRUMENTOS.map((i) => [i.id, i.lecturas]))

  assert.deepEqual(lecturas.trompa, ['fa'])
  // Corneta y trombon se leen solo en Do.
  assert.deepEqual(lecturas.corneta, ['do'])
  assert.deepEqual(lecturas.trombon, ['do'])
  assert.deepEqual(lecturas.trompeta, ['sib', 'do'])
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

test('mas tubo suena mas grave: alto saca la pieza, bajo la mete', () => {
  const trompeta = buscarInstrumento('trompeta')

  assert.equal(consejoAjuste(trompeta, 'alto', 'poco').direccion, 'sacar')
  assert.equal(consejoAjuste(trompeta, 'bajo', 'poco').direccion, 'meter')
  assert.equal(consejoAjuste(trompeta, 'afinado', 'nada').direccion, 'ninguna')
})

test('la regla de alargar y acortar vale para todos los instrumentos', () => {
  for (const instrumento of INSTRUMENTOS) {
    assert.equal(consejoAjuste(instrumento, 'alto', 'medio').direccion, 'sacar', instrumento.id)
    assert.equal(consejoAjuste(instrumento, 'bajo', 'medio').direccion, 'meter', instrumento.id)
  }
})

test('cada instrumento nombra su propia pieza de afinacion', () => {
  for (const instrumento of INSTRUMENTOS) {
    const alto = consejoAjuste(instrumento, 'alto', 'medio')
    const bajo = consejoAjuste(instrumento, 'bajo', 'medio')

    assert.equal(alto.titulo, `Saca ${instrumento.pieza}`, `${instrumento.id}: titulo inesperado`)
    assert.equal(bajo.titulo, `Mete ${instrumento.pieza}`, `${instrumento.id}: titulo inesperado`)
  }
})

test('el detalle mientras se toca es corto: solo cuánto hay que mover', () => {
  // La ubicacion de la pieza es texto de referencia y va en reposo, no aqui:
  // con el instrumento en los labios no se lee un parrafo.
  for (const instrumento of INSTRUMENTOS) {
    for (const magnitud of ['poco', 'medio', 'mucho']) {
      const { detalle } = consejoAjuste(instrumento, 'alto', magnitud)
      assert.ok(detalle.length > 0, `${instrumento.id}/${magnitud}: sin detalle`)
      assert.ok(
        detalle.length <= 60,
        `${instrumento.id}/${magnitud}: detalle demasiado largo (${detalle.length})`
      )
      assert.ok(!detalle.includes(instrumento.ubicacion))
    }
  }
})

test('cada instrumento declara una disposición válida', () => {
  for (const { id, orientacion } of INSTRUMENTOS) {
    assert.ok(['horizontal', 'vertical'].includes(orientacion), `${id}: ${orientacion}`)
  }

  // Los que se dibujan más anchos que altos se apilan; los que se sostienen
  // de pie van con el dibujo al lado del texto.
  const horizontales = INSTRUMENTOS.filter((i) => i.orientacion === 'horizontal').map((i) => i.id)
  assert.deepEqual(horizontales, ['corneta', 'trompeta', 'trombon', 'trompa'])

  const verticales = INSTRUMENTOS.filter((i) => i.orientacion === 'vertical').map((i) => i.id)
  assert.deepEqual(verticales, ['bombardino', 'tuba'])
})

test('la corneta se afina por el tudel y el resto por la bomba general', () => {
  // La corneta espanola de llaves no lleva bomba: se extrae el tudel sobre el
  // que monta la boquilla.
  const corneta = buscarInstrumento('corneta')
  assert.equal(corneta.pieza, 'el tudel')
  assert.equal(consejoAjuste(corneta, 'alto', 'poco').titulo, 'Saca el tudel')
  assert.equal(consejoAjuste(corneta, 'bajo', 'poco').titulo, 'Mete el tudel')

  for (const instrumento of INSTRUMENTOS.filter((i) => i.id !== 'corneta')) {
    assert.equal(instrumento.pieza, 'la bomba general', instrumento.id)
  }
})

test('el texto de afinado tambien nombra la pieza correcta', () => {
  assert.match(consejoAjuste(buscarInstrumento('corneta'), 'afinado', 'nada').detalle, /el tudel/)
  assert.match(
    consejoAjuste(buscarInstrumento('tuba'), 'afinado', 'nada').detalle,
    /la bomba general/
  )
})
