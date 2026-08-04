/**
 * Estado de la app y persistencia.
 *
 * No hay backend ni cuentas: todo vive en el dispositivo. localStorage basta
 * para lo unico que hay que recordar entre sesiones (instrumento, referencia
 * de afinacion y margen).
 */

import { A4_POR_DEFECTO, A4_MIN, A4_MAX } from './music/notes.js'
import { INSTRUMENTO_POR_DEFECTO, buscarInstrumento } from './music/instruments.js'

const CLAVE = 'afinador-la-salud/ajustes'

export const TOLERANCIAS = [5, 10, 15]
export const TOLERANCIA_POR_DEFECTO = 10

const PREDETERMINADO = {
  instrumento: INSTRUMENTO_POR_DEFECTO,
  a4: A4_POR_DEFECTO,
  tolerancia: TOLERANCIA_POR_DEFECTO
}

function leerGuardado() {
  try {
    const bruto = localStorage.getItem(CLAVE)
    if (!bruto) return {}
    const datos = JSON.parse(bruto)
    return typeof datos === 'object' && datos !== null ? datos : {}
  } catch {
    // Modo privado o almacenamiento bloqueado: seguimos con los valores por defecto.
    return {}
  }
}

function sanear(datos) {
  const a4 = Number(datos.a4)
  const tolerancia = Number(datos.tolerancia)

  return {
    instrumento: buscarInstrumento(datos.instrumento).id,
    a4: Number.isFinite(a4) ? Math.min(A4_MAX, Math.max(A4_MIN, Math.round(a4))) : PREDETERMINADO.a4,
    tolerancia: TOLERANCIAS.includes(tolerancia) ? tolerancia : PREDETERMINADO.tolerancia
  }
}

export function crearEstado() {
  let ajustes = sanear({ ...PREDETERMINADO, ...leerGuardado() })
  const oyentes = new Set()

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(ajustes))
    } catch {
      // Sin persistencia, la app sigue funcionando igual durante la sesion.
    }
  }

  function avisar() {
    for (const oyente of oyentes) oyente(ajustes)
  }

  return {
    get ajustes() {
      return ajustes
    },
    get instrumento() {
      return buscarInstrumento(ajustes.instrumento)
    },
    actualizar(parcial) {
      const siguiente = sanear({ ...ajustes, ...parcial })
      const hayCambio = Object.keys(siguiente).some((k) => siguiente[k] !== ajustes[k])
      if (!hayCambio) return
      ajustes = siguiente
      guardar()
      avisar()
    },
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    }
  }
}
