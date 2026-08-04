import { test } from 'node:test'
import assert from 'node:assert/strict'

import { detectarTono, UMBRAL_CLARIDAD, rms } from '../src/audio/pitch.js'
import { autocorrelacion } from '../src/audio/fft.js'

const SR = 48000
const N = 8192

/**
 * Genera una ventana de audio.
 * @param {number} f0
 * @param {number[]} amplitudes  Amplitud de cada armonico, empezando por la fundamental.
 */
function tono(f0, amplitudes = [1]) {
  const x = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    let v = 0
    for (let h = 0; h < amplitudes.length; h++) {
      // Fase distinta por armonico: asi no se acumulan todos en el mismo pico.
      v += amplitudes[h] * Math.sin(2 * Math.PI * f0 * (h + 1) * (i / SR) + h * 0.7)
    }
    x[i] = v * 0.3
  }
  return x
}

/** Error en cents entre la frecuencia detectada y la esperada. */
function cents(detectada, esperada) {
  return 1200 * Math.log2(detectada / esperada)
}

/** Ruido reproducible (LCG), para que el test no dependa de Math.random. */
function ruido(semilla = 12345) {
  const x = new Float32Array(N)
  let s = semilla
  for (let i = 0; i < N; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    x[i] = (s / 0x3fffffff - 1) * 0.3
  }
  return x
}

test('la autocorrelacion por FFT tiene su maximo en el periodo', () => {
  const f0 = 200
  const r = autocorrelacion(tono(f0))
  const periodo = Math.round(SR / f0) // 240 muestras

  assert.ok(r[0] > 0)
  // El valor en el periodo debe destacar sobre un desfase arbitrario.
  assert.ok(r[periodo] > r[periodo + Math.round(periodo / 2)] * 2)
})

test('seno puro de Si♭3 (233.08 Hz) con precision sub-cent', () => {
  const { hz, claridad } = detectarTono(tono(233.08), SR)
  assert.ok(hz, 'no se detecto nada')
  assert.ok(claridad > 0.95, `claridad demasiado baja: ${claridad}`)
  assert.ok(Math.abs(cents(hz, 233.08)) < 1, `error de ${cents(hz, 233.08).toFixed(2)} cents`)
})

test('precision estable a lo largo del registro de la banda', () => {
  for (const f of [58.27, 116.54, 261.63, 440, 698.46, 1046.5]) {
    const { hz } = detectarTono(tono(f, [1, 0.5, 0.25]), SR, { minHz: 25, maxHz: 1300 })
    assert.ok(hz, `no se detecto ${f} Hz`)
    const error = cents(hz, f)
    assert.ok(Math.abs(error) < 3, `${f} Hz: error de ${error.toFixed(2)} cents`)
  }
})

test('pedal de tuba en Si♭0 (29.14 Hz), sin error de octava', () => {
  const { hz } = detectarTono(tono(29.14, [1, 0.8, 0.6]), SR, { minHz: 25, maxHz: 400 })
  assert.ok(hz, 'no se detecto el pedal')
  const error = cents(hz, 29.14)
  assert.ok(Math.abs(error) < 10, `error de ${error.toFixed(2)} cents (hz = ${hz})`)
})

test('fundamental debilitada: devuelve la fundamental, no el segundo armonico', () => {
  // Caso tipico de la trompa: la fundamental es la parcial mas floja.
  const senal = tono(220, [0.12, 1, 0.9, 0.7, 0.5, 0.35])
  const { hz } = detectarTono(senal, SR, { minHz: 60, maxHz: 800 })

  assert.ok(hz, 'no se detecto nada')
  const error = cents(hz, 220)
  assert.ok(
    Math.abs(error) < 10,
    `salto de octava: detectado ${hz.toFixed(2)} Hz en lugar de 220 (${error.toFixed(0)} cents)`
  )
})

test('el ruido no produce una lectura fiable', () => {
  const { hz, claridad } = detectarTono(ruido(), SR)
  assert.ok(
    hz === null || claridad < UMBRAL_CLARIDAD,
    `el ruido paso el filtro: ${hz} Hz con claridad ${claridad}`
  )
})

test('el silencio no devuelve nota', () => {
  const silencio = new Float32Array(N)
  const resultado = detectarTono(silencio, SR)
  assert.equal(resultado.hz, null)
  assert.equal(resultado.nivel, 0)
})

test('la puerta de nivel deja pasar una nota audible y corta una inaudible', () => {
  const audible = tono(440)
  assert.ok(rms(audible) > 0.05)
  assert.ok(detectarTono(audible, SR).hz)

  const flojisima = tono(440)
  for (let i = 0; i < flojisima.length; i++) flojisima[i] *= 0.005
  assert.equal(detectarTono(flojisima, SR).hz, null)
})

test('una nota fuera del registro del instrumento no se cuela', () => {
  // Un armonico agudo de trompeta con la tuba seleccionada no debe reportarse
  // como si fuera esa misma frecuencia.
  const { hz } = detectarTono(tono(1046.5), SR, { minHz: 25, maxHz: 400 })
  assert.ok(hz === null || hz <= 400, `se reporto ${hz} Hz fuera del rango de la tuba`)
})
