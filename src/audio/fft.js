/**
 * FFT radix-2 iterativa in-place, sin dependencias.
 *
 * Se usa para calcular la autocorrelacion en O(n log n): con las ventanas de
 * 8192 muestras que necesita el registro grave de la tuba, la autocorrelacion
 * por fuerza bruta seria de ~15M operaciones por frame y no cabria en el
 * presupuesto de un movil.
 */

/** Tablas de senos/cosenos y de bit-reversal cacheadas por tamano. */
const cacheTablas = new Map()

function tablas(n) {
  let t = cacheTablas.get(n)
  if (t) return t

  const niveles = Math.log2(n)
  if (!Number.isInteger(niveles)) {
    throw new Error(`El tamano de la FFT debe ser potencia de 2, recibido ${n}`)
  }

  const cos = new Float64Array(n / 2)
  const sin = new Float64Array(n / 2)
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n)
    sin[i] = Math.sin((2 * Math.PI * i) / n)
  }

  // Permutacion bit-reversal precalculada.
  const rev = new Uint32Array(n)
  for (let i = 0; i < n; i++) {
    let r = 0
    for (let b = 0; b < niveles; b++) {
      r = (r << 1) | ((i >>> b) & 1)
    }
    rev[i] = r
  }

  t = { niveles, cos, sin, rev }
  cacheTablas.set(n, t)
  return t
}

/**
 * FFT compleja in-place. `re` e `im` son Float64Array del mismo tamano
 * (potencia de 2) y se sobreescriben con el resultado.
 */
export function fft(re, im) {
  const n = re.length
  const { niveles, cos, sin, rev } = tablas(n)

  for (let i = 0; i < n; i++) {
    const j = rev[i]
    if (j > i) {
      let tmp = re[i]
      re[i] = re[j]
      re[j] = tmp
      tmp = im[i]
      im[i] = im[j]
      im[j] = tmp
    }
  }

  for (let tam = 2; tam <= n; tam *= 2) {
    const mitad = tam / 2
    const paso = n / tam
    for (let i = 0; i < n; i += tam) {
      for (let j = i, k = 0; j < i + mitad; j++, k += paso) {
        const l = j + mitad
        const tre = re[l] * cos[k] + im[l] * sin[k]
        const tim = -re[l] * sin[k] + im[l] * cos[k]
        re[l] = re[j] - tre
        im[l] = im[j] - tim
        re[j] += tre
        im[j] += tim
      }
    }
  }

  void niveles
}

/** FFT inversa in-place, normalizada por 1/n. */
export function ifft(re, im) {
  const n = re.length
  for (let i = 0; i < n; i++) im[i] = -im[i]
  fft(re, im)
  for (let i = 0; i < n; i++) {
    re[i] /= n
    im[i] = -im[i] / n
  }
}

/**
 * Autocorrelacion lineal (no circular) de `senal` mediante FFT.
 *
 * Devuelve un Float64Array de `senal.length` posiciones donde la posicion tau
 * es sum(x[i]·x[i+tau]). El zero-padding al doble de tamano es lo que evita
 * el solapamiento circular que falsearia los lags largos.
 */
export function autocorrelacion(senal) {
  const n = senal.length
  let tam = 1
  while (tam < n * 2) tam *= 2

  const re = new Float64Array(tam)
  const im = new Float64Array(tam)
  for (let i = 0; i < n; i++) re[i] = senal[i]

  fft(re, im)

  // Espectro de potencia: |X|^2. La parte imaginaria se anula.
  for (let i = 0; i < tam; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i]
    im[i] = 0
  }

  ifft(re, im)

  return re.subarray(0, n)
}
