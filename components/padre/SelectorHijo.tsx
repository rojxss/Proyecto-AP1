/**
 * SelectorHijo
 * Client Component — muestra los chips de selección de hijo vinculado.
 * Cambia el searchParam ?hijo=<uuid> en la URL para que el Server Component
 * recargue los datos del estudiante seleccionado.
 *
 * Props:
 *   hijos      — lista de estudiantes vinculados al padre
 *   hijoActivo — UUID del hijo seleccionado actualmente
 */
'use client'

import { useRouter, usePathname } from 'next/navigation'
import type { Student } from '@/types/database'

interface Props {
  hijos: Pick<Student, 'id' | 'nombre_completo' | 'nivel' | 'grupo'>[]
  hijoActivo: string
}

export default function SelectorHijo({ hijos, hijoActivo }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function seleccionar(id: string) {
    const params = new URLSearchParams({ hijo: id })
    router.push(`${pathname}?${params.toString()}`)
  }

  // Solo mostrar el selector si hay más de un hijo
  if (hijos.length <= 1) return null

  return (
    <div className="selector-hijo" role="group" aria-label="Seleccionar estudiante">
      <span>Estudiante:</span>
      {hijos.map((h) => (
        <button
          key={h.id}
          className={`chip-hijo ${h.id === hijoActivo ? 'activo' : ''}`}
          onClick={() => seleccionar(h.id)}
          aria-pressed={h.id === hijoActivo}
          type="button"
        >
          {h.nombre_completo.split(' ')[0]} · {h.grupo}
        </button>
      ))}
    </div>
  )
}
