/**
 * CitasDocentePage — /docente/citas
 * Vista para que el docente gestione las citas recibidas.
 * RF-08
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatearFecha } from '@/lib/utils'
import type { EstadoCita } from '@/types/database'

// ── Server Actions ────────────────────────────────────────────────────────────

async function confirmarCita(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  const { data: cita } = await supabase
    .from('appointments')
    .select('estado, funcionario_id')
    .eq('id', id)
    .single()

  if (!cita || cita.funcionario_id !== user.id) return
  if (cita.estado !== 'Pendiente') return

  await supabase
    .from('appointments')
    .update({ estado: 'Confirmada' })
    .eq('id', id)

  revalidatePath('/docente/citas')
  revalidatePath('/padre/citas')
}

async function rechazarCita(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const motivo_rechazo = (formData.get('motivo_rechazo') as string)?.trim() || null

  if (!id) return

  const { data: cita } = await supabase
    .from('appointments')
    .select('estado, funcionario_id')
    .eq('id', id)
    .single()

  if (!cita || cita.funcionario_id !== user.id) return
  if (!['Pendiente', 'Confirmada'].includes(cita.estado)) return

  await supabase
    .from('appointments')
    .update({ estado: 'Rechazada', motivo_rechazo })
    .eq('id', id)

  revalidatePath('/docente/citas')
  revalidatePath('/padre/citas')
}

async function completarCita(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  const { data: cita } = await supabase
    .from('appointments')
    .select('estado, funcionario_id')
    .eq('id', id)
    .single()

  if (!cita || cita.funcionario_id !== user.id) return
  if (cita.estado !== 'Confirmada') return

  await supabase
    .from('appointments')
    .update({ estado: 'Completada' })
    .eq('id', id)

  revalidatePath('/docente/citas')
  revalidatePath('/padre/citas')
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CitaRow {
  id: string
  fecha: string
  motivo: string
  estado: EstadoCita
  motivo_rechazo: string | null
  padre: { nombre_completo: string }
  bloque: { etiqueta: string }
}

function ChipEstado({ estado }: { estado: EstadoCita }) {
  return <span className={`chip-estado ${estado}`}>{estado}</span>
}

const ESTADOS_ACTIVOS: EstadoCita[] = ['Pendiente', 'Confirmada']
const ESTADOS_CERRADOS: EstadoCita[] = ['Rechazada', 'Cancelada', 'Completada']

export default async function CitasDocentePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; rechazar?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const tab = params.tab ?? 'activas'
  const rechazarId = params.rechazar ?? ''

  // Cargar citas recibidas por el docente
  const { data: citasRaw } = await supabase
    .from('appointments')
    .select(`
      id, fecha, motivo, estado, motivo_rechazo,
      padre:profiles!padre_id ( nombre_completo ),
      bloque:time_blocks ( etiqueta )
    `)
    .eq('funcionario_id', user.id)
    .order('fecha', { ascending: true })
    .order('created_at', { ascending: true })

  const todasLasCitas = (citasRaw ?? []) as unknown as CitaRow[]

  const citasActivas  = todasLasCitas.filter(c => ESTADOS_ACTIVOS.includes(c.estado))
  const citasCerradas = todasLasCitas.filter(c => ESTADOS_CERRADOS.includes(c.estado))
  const citasMostrar  = tab === 'activas' ? citasActivas : citasCerradas

  // Cita en proceso de rechazo
  const citaParaRechazar = rechazarId
    ? todasLasCitas.find(c => c.id === rechazarId)
    : null

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Gestión de citas</h1>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
        Confirme, rechace o marque como completadas las citas asignadas a usted.
      </p>

      {/* Modal de rechazo inline */}
      {citaParaRechazar && (
        <div className="bloque-card" style={{ borderColor: 'var(--rojo)', marginBottom: '1.4rem' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--rojo)', marginBottom: '0.8rem' }}>
            Rechazar cita de {citaParaRechazar.padre?.nombre_completo}
          </h2>
          <p style={{ fontSize: '0.88rem', marginBottom: '0.8rem' }}>
            {formatearFecha(citaParaRechazar.fecha)} — {citaParaRechazar.bloque?.etiqueta}
          </p>
          <form action={rechazarCita}>
            <input type="hidden" name="id" value={citaParaRechazar.id} />
            <div className="campo">
              <label htmlFor="motivo_rechazo">Motivo del rechazo (opcional)</label>
              <textarea
                id="motivo_rechazo"
                name="motivo_rechazo"
                rows={2}
                maxLength={300}
                placeholder="Explique brevemente el motivo..."
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="submit" className="btn btn-peligro">Confirmar rechazo</button>
              <a href="/docente/citas" className="btn btn-secundario">Cancelar</a>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid var(--linea)', paddingBottom: '0.6rem' }}>
        <a
          href="/docente/citas?tab=activas"
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: tab === 'activas' ? 700 : 400,
            background: tab === 'activas' ? 'var(--verde-700)' : 'transparent',
            color: tab === 'activas' ? '#fff' : 'var(--tinta)',
            fontSize: '0.9rem',
          }}
        >
          Activas ({citasActivas.length})
        </a>
        <a
          href="/docente/citas?tab=historial"
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: tab === 'historial' ? 700 : 400,
            background: tab === 'historial' ? 'var(--verde-700)' : 'transparent',
            color: tab === 'historial' ? '#fff' : 'var(--tinta)',
            fontSize: '0.9rem',
          }}
        >
          Historial ({citasCerradas.length})
        </a>
      </div>

      {citasMostrar.length === 0 ? (
        <div className="mensaje-vacio">
          {tab === 'activas'
            ? 'No tiene citas activas en este momento.'
            : 'No hay citas en el historial.'}
        </div>
      ) : (
        <table className="tabla-base">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Bloque</th>
              <th>Padre/Madre</th>
              <th>Motivo</th>
              <th>Estado</th>
              {tab === 'activas' && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {citasMostrar.map(cita => (
              <tr key={cita.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                  {new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es-CR', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </td>
                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {cita.bloque?.etiqueta}
                </td>
                <td style={{ fontSize: '0.85rem' }}>{cita.padre?.nombre_completo}</td>
                <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>
                  {cita.motivo}
                  {cita.motivo_rechazo && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--rojo)', marginTop: '0.2rem' }}>
                      Rechazo: {cita.motivo_rechazo}
                    </span>
                  )}
                </td>
                <td><ChipEstado estado={cita.estado} /></td>
                {tab === 'activas' && (
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {cita.estado === 'Pendiente' && (
                        <form action={confirmarCita}>
                          <input type="hidden" name="id" value={cita.id} />
                          <button
                            type="submit"
                            className="btn"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                          >
                            Confirmar
                          </button>
                        </form>
                      )}
                      {cita.estado === 'Confirmada' && (
                        <form action={completarCita}>
                          <input type="hidden" name="id" value={cita.id} />
                          <button
                            type="submit"
                            className="btn btn-amarillo"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                          >
                            Completar
                          </button>
                        </form>
                      )}
                      {(cita.estado === 'Pendiente' || cita.estado === 'Confirmada') && (
                        <a
                          href={`/docente/citas?rechazar=${cita.id}`}
                          className="btn btn-peligro"
                          style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                        >
                          Rechazar
                        </a>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
