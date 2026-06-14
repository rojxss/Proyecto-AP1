/**
 * HorarioPadrePage — /padre/horario
 * Server Component. Obtiene los hijos vinculados al padre y el horario
 * del hijo seleccionado (por searchParam ?hijo=<uuid>).
 *
 * Requerimientos: RF-04, RF-18, RF-19, RNF-04, RNF-07, RNF-09
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatearTimestamp } from '@/lib/utils'
import SelectorHijo from '@/components/padre/SelectorHijo'
import TablaHorario from '@/components/padre/TablaHorario'
import type { ScheduleEntryConDetalles, TimeBlock, Student } from '@/types/database'

interface Props {
  searchParams: Promise<{ hijo?: string }>
}

/** Fila devuelta por el SELECT de students */
interface HijoRow {
  id: string
  nombre_completo: string
  nivel: string
  grupo: string
  activo: boolean
}

/** Fila devuelta por el SELECT de parent_student */
interface VinculoRow {
  estudiante_id: string
}

export default async function HorarioPadrePage({ searchParams }: Props) {
  const supabase = await createClient()
  const params = await searchParams

  // ── 1. Sesión (la verificación de rol ya ocurrió en layout.tsx) ──────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── 2. Hijos vinculados ──────────────────────────────────────────────────
  const { data: vinculos, error: errVinculos } = await supabase
    .from('parent_student')
    .select('estudiante_id')
    .eq('padre_id', user.id)

  if (errVinculos) {
    return <MensajeError />
  }

  if (!vinculos || vinculos.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Horario semanal</h1>
        <div className="mensaje-vacio">
          Su cuenta aún no tiene estudiantes vinculados. Comuníquese con la secretaría de la escuela.
        </div>
      </div>
    )
  }

  const estudianteIds: string[] = (vinculos as VinculoRow[]).map(
    (v: VinculoRow) => v.estudiante_id
  )

  const { data: hijos, error: errHijos } = await supabase
    .from('students')
    .select('id, nombre_completo, nivel, grupo, activo')
    .in('id', estudianteIds)
    .eq('activo', true)
    .order('nombre_completo')

  if (errHijos || !hijos || hijos.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Horario semanal</h1>
        <div className="mensaje-vacio">
          No hay estudiantes activos vinculados a su cuenta. Comuníquese con la secretaría.
        </div>
      </div>
    )
  }

  const hijosTyped = hijos as HijoRow[]

  // ── 3. Determinar hijo seleccionado (RF-18) ──────────────────────────────
  const hijoActivo: HijoRow =
    hijosTyped.find((h: HijoRow) => h.id === params.hijo) ?? hijosTyped[0]

  // ── 4. Bloques horarios institucionales ──────────────────────────────────
  const { data: bloques, error: errBloques } = await supabase
    .from('time_blocks')
    .select('id, etiqueta, orden, es_receso, es_almuerzo')
    .order('orden')

  if (errBloques) {
    return <MensajeError />
  }

  // ── 5. Entradas del horario del grupo del hijo seleccionado ──────────────
  const { data: entradasRaw, error: errEntradas } = await supabase
    .from('schedule_entries')
    .select(`
      id, grupo, dia, bloque_id, materia, docente_id, aula, updated_at,
      bloque:time_blocks ( id, etiqueta, orden, es_receso, es_almuerzo ),
      docente:profiles ( nombre_completo )
    `)
    .eq('grupo', hijoActivo.grupo)

  if (errEntradas) {
    return <MensajeError />
  }

  // Castear el resultado al tipo compuesto (el select con join devuelve objetos anidados)
  const entradas = (entradasRaw ?? []) as unknown as ScheduleEntryConDetalles[]

  // ── 6. Calcular última actualización del horario ──────────────────────────
  let ultimaActualizacion: string | null = null
  if (entradas.length > 0) {
    const maxUpdated = entradas.reduce(
      (max: string, e: ScheduleEntryConDetalles) =>
        e.updated_at > max ? e.updated_at : max,
      entradas[0].updated_at
    )
    ultimaActualizacion = formatearTimestamp(maxUpdated)
  }

  // Adaptar HijoRow a Pick<Student, ...> para el componente
  const hijosParaSelector: Pick<Student, 'id' | 'nombre_completo' | 'nivel' | 'grupo'>[] =
    hijosTyped.map((h: HijoRow) => ({
      id: h.id,
      nombre_completo: h.nombre_completo,
      nivel: h.nivel,
      grupo: h.grupo,
    }))

  return (
    <div>
      {/* Selector multi-hijo (RF-18) — solo visible si hay más de uno */}
      <SelectorHijo
        hijos={hijosParaSelector}
        hijoActivo={hijoActivo.id}
      />

      {/* Encabezado de sección */}
      <div className="titulo-seccion">
        <h1>Horario semanal</h1>
        {ultimaActualizacion && (
          <span className="meta-actualizacion">{ultimaActualizacion}</span>
        )}
      </div>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        {hijoActivo.nombre_completo} · {hijoActivo.nivel} · Grupo {hijoActivo.grupo}
      </p>

      {/* RF-19: mensaje cuando no hay horario asignado */}
      {entradas.length === 0 ? (
        <div className="mensaje-vacio">
          El horario de {hijoActivo.nombre_completo.split(' ')[0]} aún no está disponible en la plataforma.
          La escuela lo publicará próximamente. Si tiene dudas, comuníquese con la secretaría.
        </div>
      ) : (
        <TablaHorario
          bloques={(bloques ?? []) as TimeBlock[]}
          entradas={entradas}
        />
      )}
    </div>
  )
}

/** Componente de error amigable — sin detalles técnicos (RNF-09) */
function MensajeError() {
  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Horario semanal</h1>
      <div className="alerta-error">
        No fue posible cargar el horario en este momento. Intente nuevamente más tarde
        o comuníquese con la secretaría de la escuela.
      </div>
    </div>
  )
}