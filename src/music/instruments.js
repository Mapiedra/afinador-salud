/**
 * Catalogo de instrumentos de viento metal de la banda.
 *
 * Cada entrada declara sus datos como DATO, no como logica: lecturas que se
 * muestran, registro util para acotar la deteccion y textos del consejo de
 * bomba. Anadir un instrumento o una cuarta lectura (Mi♭) es anadir una fila.
 *
 * Este modulo es JavaScript puro a proposito -los dibujos viven en
 * ui/drawings.js- para poder probarlo con `node --test` sin navegador.
 */

/**
 * `lecturas` va en orden: la primera se muestra en grande y el resto debajo.
 * La trompa es la unica que lleva una sola lectura.
 *
 * `rango` acota la busqueda de la fundamental y es el segundo cortafuegos
 * contra los saltos de octava que provocan los armonicos del metal.
 */
export const INSTRUMENTOS = [
  {
    id: 'corneta',
    nombre: 'Corneta',
    abrev: 'Cor',
    lecturas: ['sib', 'do'],
    rango: { minHz: 160, maxHz: 1100 },
    ubicacionBomba: 'En la curva trasera, saliendo del tudel.'
  },
  {
    id: 'trompeta',
    nombre: 'Trompeta',
    abrev: 'Tpt',
    lecturas: ['sib', 'do'],
    rango: { minHz: 150, maxHz: 1200 },
    ubicacionBomba: 'La U grande de la curva trasera.'
  },
  {
    id: 'trombon',
    nombre: 'Trombón',
    abrev: 'Tbn',
    lecturas: ['do', 'sib'],
    rango: { minHz: 60, maxHz: 600 },
    ubicacionBomba: 'En la culata, detrás de la campana.'
  },
  {
    id: 'bombardino',
    nombre: 'Bombardino',
    abrev: 'Bmb',
    lecturas: ['do', 'sib'],
    rango: { minHz: 55, maxHz: 600 },
    ubicacionBomba: 'Junto al tudel, antes de los pistones.'
  },
  {
    id: 'trompa',
    nombre: 'Trompa',
    abrev: 'Tpa',
    lecturas: ['fa'],
    rango: { minHz: 60, maxHz: 800 },
    ubicacionBomba: 'La bomba general, en la parte alta del cuerpo.'
  },
  {
    id: 'tuba',
    nombre: 'Tuba',
    abrev: 'Tba',
    lecturas: ['do', 'sib'],
    rango: { minHz: 25, maxHz: 400 },
    ubicacionBomba: 'La bomba general del cuerpo, de recorrido largo.'
  }
]

export const INSTRUMENTO_POR_DEFECTO = 'trompeta'

/** Devuelve un instrumento por id, con respaldo al de por defecto. */
export function buscarInstrumento(id) {
  return (
    INSTRUMENTOS.find((i) => i.id === id) ??
    INSTRUMENTOS.find((i) => i.id === INSTRUMENTO_POR_DEFECTO)
  )
}

const MATICES = {
  poco: 'Muy poco, apenas unos milímetros.',
  medio: 'Un ajuste moderado, aproximadamente medio centímetro.',
  mucho: 'Bastante recorrido. Si aun así no entra, revisa embocadura, aire y temperatura del instrumento.'
}

/**
 * Texto del consejo de bomba.
 *
 * Regla fisica: mas tubo = mas grave. Si la nota sale ALTA hay que ALARGAR
 * (sacar la bomba); si sale BAJA hay que ACORTAR (meterla).
 *
 * @param {object} instrumento  Entrada de INSTRUMENTOS.
 * @param {'afinado'|'alto'|'bajo'} estado
 * @param {'nada'|'poco'|'medio'|'mucho'} magnitud
 */
export function consejoBomba(instrumento, estado, magnitud) {
  if (estado === 'afinado') {
    return {
      direccion: 'ninguna',
      titulo: 'Afinado',
      detalle: 'Mantén la bomba general donde está.'
    }
  }

  const direccion = estado === 'alto' ? 'sacar' : 'meter'
  const titulo = estado === 'alto' ? 'Saca la bomba general' : 'Mete la bomba general'
  const matiz = MATICES[magnitud] ?? ''

  return {
    direccion,
    titulo,
    detalle: `${matiz} ${instrumento.ubicacionBomba}`.trim()
  }
}
