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
 * `lecturas` va en orden y todas se muestran con el mismo peso visual. La
 * corneta (Do) y la trompa (Fa) llevan una sola; el resto, Do y Si♭.
 *
 * `rango` acota la busqueda de la fundamental y es el segundo cortafuegos
 * contra los saltos de octava que provocan los armonicos del metal.
 *
 * `pieza` es lo que el musico mueve para afinar, con su articulo, porque no
 * todos usan bomba: la corneta espanola de llaves se afina extrayendo el
 * tudel sobre el que monta la boquilla. Va como dato y no incrustado en los
 * textos para que cada instrumento diga lo suyo.
 *
 * `orientacion` es la disposicion del instrumento y decide como se reparte la
 * tarjeta de consejo: los alargados ('horizontal') llevan el dibujo arriba a
 * todo lo ancho y el texto debajo, que es donde mas grande se ve; los que se
 * sostienen de pie ('vertical') van con el dibujo a un lado y el texto al
 * otro, aprovechando el alto.
 */
export const INSTRUMENTOS = [
  {
    id: 'corneta',
    nombre: 'Corneta',
    abrev: 'Cor',
    // La corneta espanola de llaves solo se lee en Do.
    lecturas: ['do'],
    rango: { minHz: 160, maxHz: 1100 },
    orientacion: 'horizontal',
    pieza: 'el tudel',
    ubicacion: 'Es el tubo sobre el que monta la boquilla: sale entero tirando de él.'
  },
  {
    id: 'trompeta',
    nombre: 'Trompeta',
    abrev: 'Tpt',
    lecturas: ['sib', 'do'],
    rango: { minHz: 150, maxHz: 1200 },
    orientacion: 'horizontal',
    pieza: 'la bomba general',
    ubicacion: 'La U grande de la curva trasera.'
  },
  {
    id: 'trombon',
    nombre: 'Trombón',
    abrev: 'Tbn',
    // El trombon de la banda se lee solo en Do.
    lecturas: ['do'],
    rango: { minHz: 60, maxHz: 600 },
    orientacion: 'horizontal',
    pieza: 'la bomba general',
    ubicacion: 'En la culata, detrás de la campana.'
  },
  {
    id: 'bombardino',
    nombre: 'Bombardino',
    abrev: 'Bmb',
    lecturas: ['do', 'sib'],
    rango: { minHz: 55, maxHz: 600 },
    orientacion: 'vertical',
    pieza: 'la bomba general',
    ubicacion: 'Junto al tudel, antes de los pistones.'
  },
  {
    id: 'trompa',
    nombre: 'Trompa',
    abrev: 'Tpa',
    lecturas: ['fa'],
    rango: { minHz: 60, maxHz: 800 },
    // Enrollada y con la campana al lado: su dibujo sale más ancho que alto.
    orientacion: 'horizontal',
    pieza: 'la bomba general',
    ubicacion: 'En la parte alta del cuerpo.'
  },
  {
    id: 'tuba',
    nombre: 'Tuba',
    abrev: 'Tba',
    lecturas: ['do', 'sib'],
    rango: { minHz: 25, maxHz: 400 },
    orientacion: 'vertical',
    pieza: 'la bomba general',
    ubicacion: 'La del cuerpo, de recorrido largo.'
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

/* Cortos a propósito: mientras se toca no se lee un párrafo, hace falta la
   dirección y cuánto. La ubicación de la pieza se muestra solo en reposo. */
const MATICES = {
  poco: 'Muy poco, unos milímetros.',
  medio: 'Un ajuste moderado.',
  mucho: 'Bastante. Revisa también embocadura y temperatura.'
}

/**
 * Texto del consejo de afinacion.
 *
 * Regla fisica: mas tubo = mas grave. Si la nota sale ALTA hay que ALARGAR
 * (sacar la pieza); si sale BAJA hay que ACORTAR (meterla). Vale igual para
 * una bomba general que para el tudel de la corneta.
 *
 * @param {object} instrumento  Entrada de INSTRUMENTOS.
 * @param {'afinado'|'alto'|'bajo'} estado
 * @param {'nada'|'poco'|'medio'|'mucho'} magnitud
 */
export function consejoAjuste(instrumento, estado, magnitud) {
  const { pieza } = instrumento

  if (estado === 'afinado') {
    return {
      direccion: 'ninguna',
      titulo: 'Afinado',
      detalle: `Mantén ${pieza} donde está.`
    }
  }

  const direccion = estado === 'alto' ? 'sacar' : 'meter'
  const titulo = estado === 'alto' ? `Saca ${pieza}` : `Mete ${pieza}`

  return {
    direccion,
    titulo,
    detalle: MATICES[magnitud] ?? ''
  }
}
