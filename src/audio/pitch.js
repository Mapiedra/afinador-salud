/**
 * Deteccion de tono por el metodo de McLeod (MPM), sobre la NSDF
 * (Normalized Square Difference Function).
 *
 * Se elige MPM en lugar de una autocorrelacion simple porque los metales
 * tienen armonicos muy fuertes y, en algunos registros (la trompa es el caso
 * tipico), la fundamental es mas debil que el segundo armonico. La regla de
 * seleccion de pico de McLeod -quedarse con el PRIMER maximo que supere un
 * porcentaje del maximo absoluto, no con el mas alto- es justo lo que evita
 * que el afinador salte una octava arriba.
 */

import { autocorrelacion } from './fft.js'

/** Por debajo de este RMS se considera que no hay nadie tocando. */
export const UMBRAL_RMS = 0.006

/** Fiabilidad minima del pico para dar la lectura por buena. */
export const UMBRAL_CLARIDAD = 0.8

/** Umbral relativo de McLeod para la seleccion de pico. */
const K_MCLEOD = 0.85

/** Nivel eficaz de la ventana. */
export function rms(muestras) {
  let suma = 0
  for (let i = 0; i < muestras.length; i++) suma += muestras[i] * muestras[i]
  return Math.sqrt(suma / muestras.length)
}

/**
 * Calcula la NSDF de la ventana.
 *
 *   n(tau) = 2·r(tau) / m(tau)
 *   r(tau) = sum_j x[j]·x[j+tau]
 *   m(tau) = sum_j (x[j]² + x[j+tau]²)
 *
 * r(tau) sale de la autocorrelacion por FFT y m(tau) se actualiza de forma
 * incremental, asi que el coste total lo domina la FFT.
 */
function nsdfDe(muestras, tauMax) {
  const n = muestras.length
  const r = autocorrelacion(muestras)

  let m = 2 * r[0]
  const nsdf = new Float64Array(tauMax + 1)
  nsdf[0] = m > 0 ? 1 : 0

  for (let tau = 1; tau <= tauMax; tau++) {
    m -= muestras[n - tau] * muestras[n - tau] + muestras[tau - 1] * muestras[tau - 1]
    nsdf[tau] = m > 0 ? (2 * r[tau]) / m : 0
  }

  return nsdf
}

/**
 * Maximos "clave": el pico mas alto de cada region en la que la NSDF es
 * positiva, saltandose el lobulo inicial que siempre rodea a tau = 0.
 */
function maximosClave(nsdf, tauMax) {
  const picos = []
  let tau = 1

  while (tau < tauMax && nsdf[tau] > 0) tau++

  while (tau < tauMax) {
    if (nsdf[tau] > 0) {
      let mejor = tau
      while (tau < tauMax && nsdf[tau] > 0) {
        if (nsdf[tau] > nsdf[mejor]) mejor = tau
        tau++
      }
      picos.push(mejor)
    } else {
      tau++
    }
  }

  return picos
}

/** Vertice de la parabola que pasa por (tau−1, tau, tau+1). */
function afinarPico(nsdf, tau) {
  const y0 = nsdf[tau - 1]
  const y1 = nsdf[tau]
  const y2 = nsdf[tau + 1]

  const a = (y0 + y2) / 2 - y1
  const b = (y2 - y0) / 2
  if (a === 0) return { tau, valor: y1 }

  const d = -b / (2 * a)
  // Si la correccion se dispara, el pico no es parabolico: nos quedamos con el entero.
  if (!Number.isFinite(d) || Math.abs(d) > 1) return { tau, valor: y1 }

  return { tau: tau + d, valor: a * d * d + b * d + y1 }
}

/**
 * Detecta la frecuencia fundamental de una ventana de audio.
 *
 * @param {Float32Array} muestras  Ventana en el dominio del tiempo, [-1, 1].
 * @param {number} frecuenciaMuestreo  Normalmente 44100 o 48000.
 * @param {{minHz?:number, maxHz?:number, umbralRms?:number}} opciones
 *        minHz/maxHz acotan la busqueda al registro del instrumento activo:
 *        es el segundo cortafuegos contra los errores de octava.
 * @returns {{hz:number|null, claridad:number, nivel:number}}
 */
export function detectarTono(muestras, frecuenciaMuestreo, opciones = {}) {
  const { minHz = 25, maxHz = 1300, umbralRms = UMBRAL_RMS } = opciones

  const nivel = rms(muestras)
  if (nivel < umbralRms) return { hz: null, claridad: 0, nivel }

  // Quitamos la componente continua: el offset del micro falsea la NSDF.
  const n = muestras.length
  let media = 0
  for (let i = 0; i < n; i++) media += muestras[i]
  media /= n

  const limpia = new Float64Array(n)
  for (let i = 0; i < n; i++) limpia[i] = muestras[i] - media

  // Necesitamos al menos dos periodos completos dentro de la ventana.
  const tauMin = Math.max(2, Math.floor(frecuenciaMuestreo / maxHz))
  const tauMax = Math.min(Math.floor(n / 2), Math.ceil(frecuenciaMuestreo / minHz))
  if (tauMax <= tauMin + 2) return { hz: null, claridad: 0, nivel }

  const nsdf = nsdfDe(limpia, tauMax)
  const picos = maximosClave(nsdf, tauMax).filter((tau) => tau >= tauMin && tau < tauMax - 1)
  if (picos.length === 0) return { hz: null, claridad: 0, nivel }

  let mayor = 0
  for (const tau of picos) if (nsdf[tau] > mayor) mayor = nsdf[tau]
  if (mayor <= 0) return { hz: null, claridad: 0, nivel }

  // La clave del metodo: el PRIMER pico que supere el umbral relativo, no el mayor.
  const umbral = K_MCLEOD * mayor
  const elegido = picos.find((tau) => nsdf[tau] >= umbral) ?? picos[0]

  const { tau, valor } = afinarPico(nsdf, elegido)
  const hz = frecuenciaMuestreo / tau

  if (!Number.isFinite(hz) || hz < minHz || hz > maxHz) {
    return { hz: null, claridad: 0, nivel }
  }

  return { hz, claridad: Math.max(0, Math.min(1, valor)), nivel }
}
