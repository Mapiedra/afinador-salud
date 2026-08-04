import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// La versión del pie sale de package.json, para que no haya dos sitios que
// mantener sincronizados a mano.
const paquete = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Base path de GitHub Pages: https://mapiedra.github.io/afinador-salud/
// Se puede sobreescribir con BASE_PATH=/ para probar en otro hosting o en local.
const base = process.env.BASE_PATH ?? '/afinador-salud/'

export default defineConfig({
  base,
  define: {
    __VERSION__: JSON.stringify(paquete.version)
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // El logo de la cabecera lo empaqueta Vite desde index.html; aqui solo
      // hace falta el icono de iOS, que vive en public/ y nadie importa.
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Afinador Banda La Salud',
        short_name: 'Afinador',
        description:
          'Afinador para instrumentos de viento metal: corneta, trompeta, trombón, bombardino, trompa y tuba. Funciona sin conexión.',
        lang: 'es',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A0A0A',
        theme_color: '#0A0A0A',
        categories: ['music', 'education', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // La app no hace ninguna peticion de red en runtime, asi que el precache
        // completo ES el modo offline. No hacen falta estrategias adicionales.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: false
      }
    })
  ]
})
