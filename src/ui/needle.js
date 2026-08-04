/**
 * Arco de afinacion: semicirculo de -50 a +50 cents con la zona verde del
 * margen y una aguja que se mueve suavemente.
 */

const NS = 'http://www.w3.org/2000/svg'

const CX = 150
const CY = 150
const RADIO = 120
const RANGO = 50 // cents a cada lado

function crear(tag, atributos = {}) {
  const el = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v)
  return el
}

/** Angulo en radianes para un valor en cents. -50 -> izquierda, +50 -> derecha. */
function anguloDe(cents) {
  const t = (Math.max(-RANGO, Math.min(RANGO, cents)) + RANGO) / (RANGO * 2)
  return Math.PI * (1 - t)
}

function punto(cents, radio) {
  const a = anguloDe(cents)
  return { x: CX + radio * Math.cos(a), y: CY - radio * Math.sin(a) }
}

/** Descripcion de arco entre dos valores en cents, a un radio dado. */
function arco(desdeCents, hastaCents, radio) {
  const a = punto(desdeCents, radio)
  const b = punto(hastaCents, radio)
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radio} ${radio} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

export function crearArco(svg) {
  svg.replaceChildren()

  svg.appendChild(
    crear('path', {
      class: 'arco__pista',
      d: arco(-RANGO, RANGO, RADIO),
      fill: 'none'
    })
  )

  const zona = crear('path', { class: 'arco__zona', fill: 'none' })
  svg.appendChild(zona)

  // Marcas cada 10 cents.
  const marcas = crear('g', { class: 'arco__marcas' })
  for (let c = -RANGO; c <= RANGO; c += 10) {
    const principal = c === 0 || Math.abs(c) === RANGO
    const a = punto(c, RADIO - (principal ? 20 : 13))
    const b = punto(c, RADIO - 2)
    marcas.appendChild(
      crear('line', {
        class: principal ? 'arco__marca arco__marca--fuerte' : 'arco__marca',
        x1: a.x.toFixed(2),
        y1: a.y.toFixed(2),
        x2: b.x.toFixed(2),
        y2: b.y.toFixed(2)
      })
    )
  }
  svg.appendChild(marcas)

  // Etiquetas de los extremos y del centro.
  const etiquetas = crear('g', { class: 'arco__etiquetas' })
  for (const [c, texto, anclaje] of [
    [-RANGO, '−50', 'start'],
    [0, '0', 'middle'],
    [RANGO, '+50', 'end']
  ]) {
    const p = punto(c, RADIO - 34)
    const t = crear('text', {
      class: 'arco__etiqueta',
      x: p.x.toFixed(2),
      y: (p.y + 5).toFixed(2),
      'text-anchor': anclaje
    })
    t.textContent = texto
    etiquetas.appendChild(t)
  }
  svg.appendChild(etiquetas)

  const aguja = crear('g', { class: 'arco__aguja' })
  const varilla = crear('line', {
    class: 'arco__varilla',
    x1: CX,
    y1: CY,
    x2: CX,
    y2: CY - (RADIO - 8)
  })
  aguja.appendChild(varilla)
  svg.appendChild(aguja)

  svg.appendChild(crear('circle', { class: 'arco__eje', cx: CX, cy: CY, r: 9 }))

  let toleranciaActual = 10
  dibujarZona(10)

  function dibujarZona(tolerancia) {
    zona.setAttribute('d', arco(-tolerancia, tolerancia, RADIO))
  }

  return {
    fijarTolerancia(tolerancia) {
      if (tolerancia === toleranciaActual) return
      toleranciaActual = tolerancia
      dibujarZona(tolerancia)
    },

    /**
     * @param {number|null} cents  null cuando no hay lectura fiable.
     * @param {'afinado'|'alto'|'bajo'|'inactivo'} estado
     */
    actualizar(cents, estado) {
      const valor = cents ?? 0
      const grados = (valor / RANGO) * 90
      // Via style (no atributo) para que la transicion CSS la anime.
      aguja.style.transform = `rotate(${grados.toFixed(2)}deg)`
      svg.dataset.estado = estado
    }
  }
}
