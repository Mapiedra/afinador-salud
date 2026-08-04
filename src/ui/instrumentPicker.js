/**
 * Selector de instrumento: el unico selector de la pantalla. De el dependen
 * las lecturas que se muestran, el registro de busqueda y el dibujo de bomba.
 */

import { INSTRUMENTOS } from '../music/instruments.js'

export function crearSelector({ contenedor, estado }) {
  const botones = new Map()

  for (const instrumento of INSTRUMENTOS) {
    const boton = document.createElement('button')
    boton.type = 'button'
    boton.className = 'chip-instrumento'
    boton.dataset.instrumento = instrumento.id
    boton.setAttribute('aria-pressed', 'false')
    boton.innerHTML = `
      <span class="chip-instrumento__nombre">${instrumento.nombre}</span>
      <span class="chip-instrumento__tono">${etiquetaLecturas(instrumento)}</span>
    `
    contenedor.appendChild(boton)
    botones.set(instrumento.id, boton)
  }

  contenedor.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-instrumento]')
    if (!boton) return
    estado.actualizar({ instrumento: boton.dataset.instrumento })
  })

  function pintar({ instrumento }) {
    for (const [id, boton] of botones) {
      const activo = id === instrumento
      boton.classList.toggle('chip-instrumento--activo', activo)
      boton.setAttribute('aria-pressed', String(activo))
    }
  }

  estado.suscribir(pintar)
  pintar(estado.ajustes)
}

function etiquetaLecturas(instrumento) {
  return instrumento.lecturas
    .map((t) => ({ do: 'Do', sib: 'Si♭', fa: 'Fa' })[t])
    .join(' · ')
}
