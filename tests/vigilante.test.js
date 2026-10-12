import { test } from 'node:test'
import assert from 'node:assert/strict'

import { crearVigilante, esSilencioDigital } from '../src/audio/vigilante.js'

test('silencio digital: solo ceros exactos o sin datos', () => {
  assert.equal(esSilencioDigital(new Float32Array(8192)), true)
  assert.equal(esSilencioDigital(null), true)

  // Ruido de fondo de un micro real, muy por debajo de cualquier nota.
  const ruido = new Float32Array(8192)
  ruido[4000] = 3e-5
  assert.equal(esSilencioDigital(ruido), false)
})

test('con señal no hace nada', () => {
  const v = crearVigilante({ limiteSilencioMs: 1000 })
  v.reiniciar(0)
  for (let t = 0; t <= 10000; t += 100) assert.equal(v.observar(true, t), 'senal')
  assert.equal(v.intentos, 0)
})

test('silencio breve: espera; silencio largo: recupera', () => {
  const v = crearVigilante({ limiteSilencioMs: 1000 })
  v.reiniciar(0)
  assert.equal(v.observar(false, 500), 'esperar')
  assert.equal(v.observar(false, 999), 'esperar')
  assert.equal(v.observar(false, 1000), 'recuperar')
})

test('avisa tras los intentos automáticos y luego reintenta más despacio', () => {
  const v = crearVigilante({ limiteSilencioMs: 1000, intentosAntesDeAvisar: 2, intervaloReintentoMs: 5000 })
  v.reiniciar(0)

  assert.equal(v.observar(false, 1000), 'recuperar')
  v.intentado(1000)
  assert.equal(v.avisar, false)

  assert.equal(v.observar(false, 1500), 'esperar')
  assert.equal(v.observar(false, 2000), 'recuperar')
  v.intentado(2000)
  assert.equal(v.avisar, true)

  // Ya avisado: no machaca cada segundo.
  assert.equal(v.observar(false, 3000), 'esperar')
  assert.equal(v.observar(false, 6999), 'esperar')
  assert.equal(v.observar(false, 7000), 'recuperar')
})

test('la señal que vuelve borra los intentos', () => {
  const v = crearVigilante({ limiteSilencioMs: 1000, intentosAntesDeAvisar: 2 })
  v.reiniciar(0)
  v.intentado(1000)
  v.intentado(2000)
  assert.equal(v.avisar, true)

  assert.equal(v.observar(true, 2500), 'senal')
  assert.equal(v.avisar, false)
  assert.equal(v.observar(false, 3000), 'esperar')
  assert.equal(v.observar(false, 3500), 'recuperar')
})

test('sin margen previo, el primer silencio arranca la cuenta', () => {
  const v = crearVigilante({ limiteSilencioMs: 1000 })
  assert.equal(v.observar(false, 5000), 'esperar')
  assert.equal(v.observar(false, 6000), 'recuperar')
})
