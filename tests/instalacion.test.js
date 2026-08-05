import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  debeMostrarBoton,
  debeMostrarInstrucciones,
  decidirEstado,
  esDispositivoIOS,
  explicarEstado,
  puedeLanzarDialogo
} from '../src/pwa/estadoInstalacion.js'

const EVENTO = { prompt() {} }

test('ejecutándose como app instalada no se ofrece instalar', () => {
  assert.equal(decidirEstado({ standalone: true, evento: EVENTO }), 'instalada')
  assert.equal(decidirEstado({ instalada: true, evento: EVENTO }), 'instalada')

  // Aunque el navegador ofrezca el evento, estar ya instalada manda.
  assert.equal(decidirEstado({ standalone: true, soportaEvento: true }), 'instalada')
})

test('con el evento capturado se puede lanzar el diálogo nativo', () => {
  const estado = decidirEstado({ evento: EVENTO, soportaEvento: true })
  assert.equal(estado, 'disponible')
  assert.ok(puedeLanzarDialogo(estado))
  assert.ok(debeMostrarBoton(estado))
  assert.ok(!debeMostrarInstrucciones(estado))
})

test('en iOS se ofrecen instrucciones, no diálogo', () => {
  const estado = decidirEstado({ esIOS: true, soportaEvento: false })
  assert.equal(estado, 'ios')
  assert.ok(!puedeLanzarDialogo(estado))
  assert.ok(debeMostrarInstrucciones(estado))
  assert.ok(debeMostrarBoton(estado))
})

test('sin soporte el botón no se muestra: no habría nada que explicar', () => {
  const estado = decidirEstado({ soportaEvento: false })
  assert.equal(estado, 'no-soportado')
  assert.ok(!debeMostrarBoton(estado))
})

test('esperando el evento se ofrecen instrucciones, no un botón muerto', () => {
  // Chrome entrega el evento una sola vez: si aún no ha llegado, o si ya se
  // consumió al rechazar el diálogo, el botón debe seguir sirviendo para algo.
  const estado = decidirEstado({ soportaEvento: true })
  assert.equal(estado, 'esperando')
  assert.ok(debeMostrarBoton(estado))
  assert.ok(debeMostrarInstrucciones(estado))
  assert.ok(!puedeLanzarDialogo(estado))
})

test('instalada es el único caso, junto a sin soporte, que oculta el botón', () => {
  const ocultan = ['instalada', 'no-soportado']
  for (const estado of ['instalada', 'disponible', 'ios', 'no-soportado', 'esperando']) {
    assert.equal(debeMostrarBoton(estado), !ocultan.includes(estado), estado)
  }
})

test('sin argumentos no revienta y cae en no-soportado', () => {
  assert.equal(decidirEstado(), 'no-soportado')
  assert.equal(decidirEstado(undefined), 'no-soportado')
})

test('detección de iPhone, iPad y iPadOS moderno', () => {
  assert.ok(esDispositivoIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'))
  assert.ok(esDispositivoIOS('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)'))

  // El iPad moderno se anuncia como Macintosh: hay que mirar si es táctil.
  const iPadOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  assert.ok(esDispositivoIOS(iPadOS, 5), 'iPadOS táctil debería detectarse')
  assert.ok(!esDispositivoIOS(iPadOS, 0), 'un Mac de escritorio no es iOS')

  assert.ok(!esDispositivoIOS('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120', 5))
  assert.ok(!esDispositivoIOS('', 0))
})

test('cada estado tiene una explicación propia y en español', () => {
  const vistos = new Set()
  for (const estado of ['instalada', 'disponible', 'ios', 'no-soportado', 'esperando']) {
    const texto = explicarEstado(estado)
    assert.ok(texto.length > 10, `${estado}: explicación demasiado corta`)
    assert.ok(!vistos.has(texto), `${estado}: explicación repetida`)
    vistos.add(texto)
  }

  // Un estado desconocido no debe dejar la interfaz en blanco.
  assert.equal(explicarEstado('lo-que-sea'), explicarEstado('esperando'))
})
