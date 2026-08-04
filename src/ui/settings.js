/**
 * Hoja de ajustes: referencia de afinacion (La4) y margen en cents.
 * No hay selector de tonalidad: las lecturas las decide el instrumento.
 */

import { A4_MIN, A4_MAX } from '../music/notes.js'

export function crearAjustes({ estado, elementos }) {
  const { hoja, abrir, cerrar, rango, salida, menos, mas, grupoTolerancia } = elementos

  function pintar({ a4, tolerancia }) {
    rango.value = String(a4)
    salida.textContent = `${a4} Hz`
    for (const chip of grupoTolerancia.querySelectorAll('[data-tol]')) {
      const activo = Number(chip.dataset.tol) === tolerancia
      chip.classList.toggle('chip-tol--activo', activo)
      chip.setAttribute('aria-checked', String(activo))
    }
  }

  function moverA4(delta) {
    const siguiente = Math.min(A4_MAX, Math.max(A4_MIN, estado.ajustes.a4 + delta))
    estado.actualizar({ a4: siguiente })
  }

  abrir.addEventListener('click', () => {
    hoja.hidden = false
    requestAnimationFrame(() => hoja.classList.add('hoja--visible'))
  })

  function cerrarHoja() {
    hoja.classList.remove('hoja--visible')
    setTimeout(() => {
      hoja.hidden = true
    }, 200)
  }

  cerrar.addEventListener('click', cerrarHoja)
  for (const fondo of hoja.querySelectorAll('[data-cerrar-ajustes]')) {
    fondo.addEventListener('click', cerrarHoja)
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !hoja.hidden) cerrarHoja()
  })

  rango.addEventListener('input', () => estado.actualizar({ a4: Number(rango.value) }))
  menos.addEventListener('click', () => moverA4(-1))
  mas.addEventListener('click', () => moverA4(1))

  grupoTolerancia.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-tol]')
    if (!chip) return
    estado.actualizar({ tolerancia: Number(chip.dataset.tol) })
  })

  estado.suscribir(pintar)
  pintar(estado.ajustes)

  return { cerrar: cerrarHoja }
}
