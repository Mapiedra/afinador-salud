/**
 * Dibujos de los instrumentos, indexados por id.
 *
 * Se separan de music/instruments.js porque el sufijo `?raw` es cosa de Vite:
 * dejandolo aqui, la tabla de instrumentos sigue siendo JavaScript puro y se
 * puede probar con `node --test`.
 */

import corneta from '../assets/instruments/corneta.svg?raw'
import trompeta from '../assets/instruments/trompeta.svg?raw'
import trombon from '../assets/instruments/trombon.svg?raw'
import bombardino from '../assets/instruments/bombardino.svg?raw'
import trompa from '../assets/instruments/trompa.svg?raw'
import tuba from '../assets/instruments/tuba.svg?raw'

export const DIBUJOS = {
  corneta,
  trompeta,
  trombon,
  bombardino,
  trompa,
  tuba
}
