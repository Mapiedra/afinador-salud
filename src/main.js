/**
 * Afinador Banda La Salud.
 *
 * Une captura de microfono, deteccion de tono e interfaz. Todo ocurre en el
 * dispositivo: la app no hace ninguna peticion de red en tiempo de ejecucion,
 * que es lo que permite que funcione entera sin conexion.
 */

import './styles/tokens.css'
import './styles/layout.css'
import './styles/components.css'

import { crearMicrofono } from './audio/mic.js'
import { detectarTono, UMBRAL_CLARIDAD } from './audio/pitch.js'
import { analizarFrecuencia, estadoAfinacion, magnitudDesviacion } from './music/notes.js'
import { crearEstado } from './state.js'
import { crearArco } from './ui/needle.js'
import { crearDisplayNota } from './ui/noteDisplay.js'
import { crearConsejo } from './ui/slideAdvice.js'
import { crearSelector } from './ui/instrumentPicker.js'
import { crearAjustes } from './ui/settings.js'
import { crearInstalacion } from './pwa/instalacion.js'

/** Cada cuanto se analiza una ventana. 25 Hz basta y deja la UI a 60 fps. */
const PERIODO_ANALISIS_MS = 40

/** Muestras de la mediana que quita el temblor de la aguja. */
const VENTANA_MEDIANA = 5

/** Suavizado exponencial sobre el MIDI ya filtrado. */
const ALFA = 0.3

/** Cuanto se mantiene la ultima nota en pantalla tras dejar de sonar. */
const RETENCION_MS = 900

const $ = (id) => document.getElementById(id)

const app = $('app')
const estado = crearEstado()

const arco = crearArco($('arco'))
const display = crearDisplayNota(
  ['a', 'b'].map((clave) => ({
    raiz: $(`lectura-${clave}`),
    tono: $(`lectura-${clave}-tono`),
    nombre: $(`lectura-${clave}-nombre`),
    octava: $(`lectura-${clave}-octava`)
  }))
)
const consejo = crearConsejo({
  contenedor: $('consejo'),
  dibujo: $('consejo-svg'),
  titulo: $('consejo-titulo'),
  detalle: $('consejo-detalle')
})

crearSelector({ contenedor: $('selector-instrumento'), estado })
crearAjustes({
  estado,
  elementos: {
    hoja: $('hoja-ajustes'),
    abrir: $('btn-ajustes'),
    cerrar: $('cerrar-ajustes'),
    rango: $('input-a4'),
    salida: $('salida-a4'),
    menos: $('a4-menos'),
    mas: $('a4-mas'),
    grupoTolerancia: $('grupo-tolerancia')
  }
})

// --- Instalacion ----------------------------------------------------------

const btnInstalar = $('btn-instalar')
const capaInstalar = $('capa-instalar')
const instalacionEstado = $('instalacion-estado')
const instalacionTraza = $('instalacion-traza')

const instalacion = crearInstalacion({
  alCambiar() {
    pintarInstalacion()
  }
})

function pintarInstalacion() {
  const { estado, explicacion, lineas } = instalacion.diagnostico()
  btnInstalar.hidden = !instalacion.debeMostrarBoton()
  app.dataset.instalacion = estado
  instalacionEstado.textContent = explicacion
  instalacionTraza.textContent = lineas.join('\n')
}

btnInstalar.addEventListener('click', async () => {
  // Con el evento en la mano, diálogo nativo. Si no -iOS, o Chrome que aún no
  // lo ha ofrecido o ya lo consumió-, explicamos el gesto manual en vez de
  // dejar el botón sin hacer nada.
  if (instalacion.estado() === 'disponible') {
    btnInstalar.disabled = true
    await instalacion.instalar()
    btnInstalar.disabled = false
    pintarInstalacion()
    return
  }

  $('pasos-ios').hidden = !instalacion.esIOS
  $('pasos-navegador').hidden = instalacion.esIOS
  capaInstalar.hidden = false
})

$('instalar-cerrar').addEventListener('click', () => {
  capaInstalar.hidden = true
})

$('instalacion-copiar').addEventListener('click', () => {
  navigator.clipboard?.writeText(instalacionTraza.textContent).then(
    () => {
      $('instalacion-copiar').textContent = 'Copiado'
    },
    () => {}
  )
})

// Chrome puede tardar unos segundos en decidir que la ofrece; refrescamos el
// estado un par de veces para que el diagnóstico no mienta si se abre pronto.
pintarInstalacion()
for (const espera of [1500, 5000]) setTimeout(pintarInstalacion, espera)

// --- Microfono ------------------------------------------------------------

const capa = $('capa-permiso')
const capaTitulo = $('capa-titulo')
const capaTexto = $('capa-texto')
const capaBoton = $('capa-boton')
const capaTraza = $('capa-traza')
const estadoMicroTexto = $('estado-micro-texto')

const MENSAJES_CAPA = {
  gesto: {
    titulo: 'Activar micrófono',
    texto: 'Toca para empezar a afinar. El audio no sale nunca de tu dispositivo.',
    boton: 'Activar'
  },
  denegado: {
    titulo: 'Micrófono bloqueado',
    texto:
      'El navegador tiene denegado el permiso. Ábrelo en los ajustes del sitio, permite el micrófono y vuelve a intentarlo.',
    boton: 'Reintentar'
  },
  'sin-soporte': {
    titulo: 'Navegador no compatible',
    texto: 'Este navegador no permite capturar audio. Prueba con Chrome, Safari o Firefox actualizados.',
    boton: 'Reintentar'
  },
  error: {
    titulo: 'No se pudo abrir el micrófono',
    texto: 'Comprueba que ninguna otra aplicación lo esté usando y vuelve a intentarlo.',
    boton: 'Reintentar'
  }
}

const ETIQUETAS_ESTADO = {
  iniciando: 'Iniciando…',
  escuchando: 'Escuchando',
  silenciado: 'Silenciado',
  gesto: 'Toca para activar',
  denegado: 'Sin permiso',
  'sin-soporte': 'No compatible',
  error: 'Error de micrófono'
}

const microfono = crearMicrofono({
  alCambiarEstado(nuevo) {
    app.dataset.microfono = nuevo
    estadoMicroTexto.textContent = ETIQUETAS_ESTADO[nuevo] ?? nuevo

    const mensaje = MENSAJES_CAPA[nuevo]
    if (mensaje) {
      capaTitulo.textContent = mensaje.titulo
      capaTexto.textContent = mensaje.texto
      capaBoton.textContent = mensaje.boton
      capa.hidden = false
      pintarDiagnostico()
    } else {
      capa.hidden = true
    }

    if (nuevo === 'escuchando') pedirWakeLock()
    else soltarWakeLock()
  }
})

const AYUDA_MOTIVO = {
  'contexto-suspendido':
    'El navegador sigue bloqueando el audio. Vuelve a tocar; si no arranca, cierra la app y ábrela de nuevo.',
  'permiso-sin-respuesta':
    'No llegó respuesta al permiso del micrófono. Acepta el diálogo del navegador y vuelve a tocar; si lo concediste desde el candado de la barra de direcciones, recarga la página.',
  'resume-sin-respuesta':
    'El navegador no ha devuelto el control del audio. Vuelve a tocar el botón.'
}

function pintarDiagnostico() {
  const d = microfono.diagnostico
  capaTraza.textContent = [
    `estado: ${d.estado}${d.motivo ? ` (${d.motivo})` : ''}`,
    `contexto: ${d.contexto}${d.frecuenciaMuestreo ? ` @ ${d.frecuenciaMuestreo} Hz` : ''}`,
    `flujo activo: ${d.flujoActivo ? 'sí' : 'no'}`,
    `pistas: ${d.pistas.length ? d.pistas.join(', ') : 'ninguna'}`,
    `grafo montado: ${d.grafo ? 'sí' : 'no'}`,
    '',
    ...microfono.traza
  ].join('\n')
}

/** Red de seguridad de la interfaz: el botón nunca se queda en «Activando…». */
function conLimite(promesa, ms) {
  return Promise.race([promesa, new Promise((listo) => setTimeout(() => listo(false), ms))])
}

// El boton debe dar respuesta SIEMPRE: si el intento falla sin cambiar de
// estado, la capa no se repintaria sola y pareceria que no hace nada.
capaBoton.addEventListener('click', async () => {
  capaBoton.disabled = true
  capaBoton.textContent = 'Activando…'

  let listo = false
  try {
    listo = await conLimite(microfono.iniciar(true), 15000)
  } finally {
    capaBoton.disabled = false
    pintarDiagnostico()
  }

  if (listo) {
    // No basta con esperar al cambio de estado: si ya estabamos en
    // 'escuchando', `fijarEstado` no dispara el aviso y la capa se quedaria
    // puesta encima de la app.
    capa.hidden = true
    capaBoton.textContent = MENSAJES_CAPA.gesto.boton
    return
  }

  capaBoton.textContent = 'Reintentar'
  capaTexto.textContent =
    AYUDA_MOTIVO[microfono.motivo] ??
    (MENSAJES_CAPA[microfono.estado] ?? MENSAJES_CAPA.gesto).texto
})

$('capa-copiar').addEventListener('click', () => {
  navigator.clipboard?.writeText(capaTraza.textContent).then(
    () => {
      $('capa-copiar').textContent = 'Copiado'
    },
    () => {}
  )
})

$('btn-escucha').addEventListener('click', () => microfono.alternar())

// --- Wake lock ------------------------------------------------------------

let wakeLock = null

async function pedirWakeLock() {
  if (!('wakeLock' in navigator) || wakeLock) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      wakeLock = null
    })
  } catch {
    // No es critico: si el sistema no lo concede, la app sigue funcionando.
  }
}

function soltarWakeLock() {
  wakeLock?.release().catch(() => {})
  wakeLock = null
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && microfono.estado === 'escuchando') pedirWakeLock()
})

// --- Suavizado ------------------------------------------------------------

const historico = []
let midiSuave = null
let ultimaLectura = 0

function suavizar(midi) {
  historico.push(midi)
  if (historico.length > VENTANA_MEDIANA) historico.shift()

  const ordenado = [...historico].sort((a, b) => a - b)
  const mediana = ordenado[Math.floor(ordenado.length / 2)]

  // Un salto grande es un cambio de nota real, no ruido: reenganchamos de golpe.
  if (midiSuave === null || Math.abs(mediana - midiSuave) > 0.6) {
    midiSuave = mediana
  } else {
    midiSuave = midiSuave + ALFA * (mediana - midiSuave)
  }

  return midiSuave
}

function reiniciarSuavizado() {
  historico.length = 0
  midiSuave = null
}

// --- Bucle de analisis ----------------------------------------------------

const cifraCents = $('cifra-cents')
const cifraHz = $('cifra-hz')
const lecturaHz = $('lectura-hz')
const lecturaA4 = $('lectura-a4')

let ultimoAnalisis = 0

function mostrarReposo() {
  const instrumento = estado.instrumento
  app.dataset.estado = 'inactivo'
  arco.actualizar(null, 'inactivo')
  display.limpiar(instrumento)
  consejo.reposo(instrumento)
  cifraCents.textContent = '—'
  cifraHz.textContent = 'Δ — Hz'
  lecturaHz.textContent = '— Hz'
}

function bucle(ahora) {
  requestAnimationFrame(bucle)

  if (ahora - ultimoAnalisis < PERIODO_ANALISIS_MS) return
  ultimoAnalisis = ahora

  const muestras = microfono.leerVentana()
  const instrumento = estado.instrumento
  const { a4, tolerancia } = estado.ajustes

  if (muestras) {
    const { hz, claridad } = detectarTono(muestras, microfono.frecuenciaMuestreo, {
      minHz: instrumento.rango.minHz,
      maxHz: instrumento.rango.maxHz
    })

    if (hz && claridad >= UMBRAL_CLARIDAD) {
      const bruto = analizarFrecuencia(hz, a4)
      const midi = suavizar(bruto.midi)
      const analisis = analizarFrecuencia(a4 * Math.pow(2, (midi - 69) / 12), a4)

      const clase = estadoAfinacion(analisis.cents, tolerancia)
      const magnitud = magnitudDesviacion(analisis.cents, tolerancia)

      app.dataset.estado = clase
      arco.actualizar(analisis.cents, clase)
      display.actualizar(analisis.midiCercano, instrumento)
      consejo.actualizar(instrumento, clase, magnitud)

      cifraCents.textContent = `${formatearSigno(analisis.cents, 0)} cents`
      cifraHz.textContent = `Δ ${formatearSigno(analisis.deltaHz, 1)} Hz`
      lecturaHz.textContent = `${hz.toFixed(1)} Hz`

      ultimaLectura = ahora
      return
    }
  }

  // Sin lectura fiable: mantenemos un instante la ultima nota y luego reposo.
  if (ultimaLectura && ahora - ultimaLectura < RETENCION_MS) {
    app.dataset.estado = `${app.dataset.estado ?? 'inactivo'}`
    return
  }

  if (midiSuave !== null || app.dataset.estado !== 'inactivo') {
    reiniciarSuavizado()
    mostrarReposo()
  }
}

function formatearSigno(valor, decimales) {
  const n = Number(valor.toFixed(decimales))
  const texto = Math.abs(n).toFixed(decimales)
  if (n > 0) return `+${texto}`
  if (n < 0) return `−${texto}`
  return decimales > 0 ? `±${texto}` : '0'
}

// --- Arranque -------------------------------------------------------------

estado.suscribir(({ a4, tolerancia }) => {
  lecturaA4.textContent = `A4 ${a4}`
  arco.fijarTolerancia(tolerancia)
  reiniciarSuavizado()
  mostrarReposo()
})

lecturaA4.textContent = `A4 ${estado.ajustes.a4}`
arco.fijarTolerancia(estado.ajustes.tolerancia)
mostrarReposo()

// `__VERSION__` lo sustituye Vite con la versión de package.json.
$('pie-version').textContent = `v${__VERSION__}`

requestAnimationFrame(bucle)

// El microfono arranca solo: no hay boton de inicio. Si el navegador exige un
// gesto, crearMicrofono pasa a estado 'gesto' y aparece la capa de rescate.
microfono.iniciar(false)
