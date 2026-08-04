/**
 * Genera los iconos de la PWA a partir de logoLaSalud.png.
 *
 *   node scripts/generate-icons.mjs
 *
 * El logo original mide 200x200, asi que el icono de 512 se reescala hacia
 * arriba y queda ligeramente suave. Si algun dia aparece el logo en vectorial
 * o a mayor resolucion, basta con sustituir el fichero de origen y volver a
 * ejecutar este script.
 */

import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const origen = resolve(raiz, 'logoLaSalud.png')
const destino = resolve(raiz, 'public', 'icons')

const FONDO = { r: 10, g: 10, b: 12, alpha: 1 }

/**
 * @param {string} nombre
 * @param {number} lado      Lado del icono final.
 * @param {number} proporcion  Fraccion del lado que ocupa el logo.
 *                             0.86 para iconos normales; 0.62 para maskable,
 *                             que debe respetar la zona segura del 80 %.
 */
async function icono(nombre, lado, proporcion) {
  const logo = Math.round(lado * proporcion)

  const capa = await sharp(origen)
    .resize(logo, logo, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: { width: lado, height: lado, channels: 4, background: FONDO }
  })
    .composite([{ input: capa, gravity: 'center' }])
    .png()
    .toFile(resolve(destino, nombre))

  console.log(`  ${nombre}  ${lado}x${lado}`)
}

await mkdir(destino, { recursive: true })

console.log('Generando iconos desde logoLaSalud.png…')
await icono('icon-192.png', 192, 0.86)
await icono('icon-512.png', 512, 0.86)
await icono('icon-512-maskable.png', 512, 0.62)
await icono('apple-touch-icon.png', 180, 0.84)
console.log('Listo.')
