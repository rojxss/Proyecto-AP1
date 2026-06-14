/**
 * CitasAdminPage — /admin/citas
 * Vista completa de todas las citas. El admin puede cambiar cualquier estado.
 * RF-08, RF-16
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EstadoCita } from '@/types/database'

// ── Server Actions ────────────────────────────────────────────────────────────

async function cambiarEstado(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const nuevoEstado = formData.get('estado') as EstadoCita
  const motivo_rechazo = (formData.get('motivo_rechazo') as string)?.trim() || null

  if (!id || !nuevoEstado) return

  const { data: cita } = await supabase
    .from('appointments')
    .select('estado')
    .eq('id', id)
    .single()

  if (!cita || cita.estado === 'Completada') return

  await supabase
    .from('appointments')
    .update({ estado: nuevoEstado, ...(motivo_rechazo ? { motivo_rechazo } : {}) })
    .eq('id', id)

  revalidatePath('/admin/citas')
  revalidatePath('/padre/citas')
  revalidatePath('/docente/citas')
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CitaRow {
  id: string
  fecha: string
  motivo: string
  estado: EstadoCita
  motivo_rechazo: string | null
  created_at: string
  padre: { nombre_completo: string }
  funcionario: { nombre_completo: string }
  bloque: { etiqueta: string }
}

function ChipEstado({ estado }: { estado: EstadoCita }) {
  return <span className={`chip-estado ${estado}`}>{estado}</span>
}

const TODOS_ESTADOS: (EstadoCita | '')[] = ['', 'Pendiente', 'Confirmada', 'Rechazada', 'Cancelada', 'Completada']

export default async function CitasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; rechazar?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const estadoFiltro = (params.estado ?? '') as EstadoCita | ''
  const rechazarId = params.rechazar ?? ''

  let query = supabase
    .from('appointments')
    .select(`
      id, fecha, motivo, estado, motivo_rechazo, created_at,
      padre:profiles!padre_id(nombre_completo),
      funcionario:profiles!funcionario_id(nombre_completo),
      bloque:time_blocks(etiqueta)
    `)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (estadoFiltro) {
    query = query.eq('estado', estadoFiltro)
  }

  const { data: citasRaw } = await query
  const citas = (citasRaw ?? []) as unknown as CitaRow[]

  const citaParaRechazar = rechazarId ? citas.find(c => c.id === rechazarId) : null

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Gestión de citas</h1>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
        Vista completa de todas las citas. Puede cambiar el estado de cualquier cita no completada.
      </p>

      {/* Panel de rechazo inline */}
      {citaParaRechazar && (
        <div className="bloque-card" style={{ borderColor: 'var(--rojo)', marginBottom: '1.4rem' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--rojo)', marginBottom: '0.8rem' }}>
            Rechazar cita de {citaParaRechazar.padre?.nombre_completo}
          </h2>
          <p style={{ fontSize: '0.88rem', marginBottom: '0.8rem' }}>
            {new Date(citaParaRechazar.fecha + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' — '}{citaParaRechazar.bloque?.etiqueta} — Con {citaParaRechazar.funcionario?.nombre_completo}
          </p>
          <form action={cambiarEstado}>
            <input type="hidden" name="id" value={citaParaRechazar.id} />
            <input type="hidden" name="estado" value="Rechazada" />
            <div className="campo">
              <label htmlFor="motivo_rechazo">Motivo del rechazo (opcional)</label>
              <textarea id="motivo_rechazo" name="motivo_rechazo" rows={2} maxLength={300} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="submit" className="btn btn-peligro">Confirmar rechazo</button>
              <a href="/admin/citas" className="btn btn-secundario">Cancelar</a>
            </div>
          </form>
        </div>
      )}

      {/* Filtro por estado */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>Estado:</span>
        {TODOS_ESTADOS.map(e => (
          <a
            key={e || 'todos'}
            href={e ? `/admin/citas?estado=${e}` : '/admin/citas'}
            className={`chip-hijo ${estadoFiltro === e ? 'activo' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            {e || 'Todos'}
          </a>
        ))}
      </div>

      {citas.length === 0 ? (
        <div className="mensaje-vacio">No hay citas{estadoFiltro ? ` con estado "${estadoFiltro}"` : ''}.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabla-base">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Bloque</th>
                <th>Padre/Madre</th>
                <th>Funcionario</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {citas.map(cita => (
                <tr key={cita.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                    {new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es-CR', {
                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{cita.bloque?.etiqueta}</td>
                  <td style={{ fontSize: '0.82rem' }}>{cita.padre?.nombre_completo}</td>
                  <td style={{ fontSize: '0.82rem' }}>{cita.funcionario?.nombre_completo}</td>
                  <td style={{ fontSize: '0.82rem', maxWidth: '160px' }}>
                    {cita.motivo}
                    {cita.motivo_rechazo && (
                      <span style={{ display: 'block', fontSize: '0.73rem', color: 'var(--rojo)', marginTop: '0.15rem' }}>
                        Rechazo: {cita.motivo_rechazo}
                      </span>
                    )}
                  </td>
                  <td><ChipEstado estado={cita.estado} /></td>
                  <td>
                    {cita.estado !== 'Completada' && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {cita.estado === 'Pendiente' && (
                          <form action={cambiarEstado}>
                            <input type="hidden" name="id" value={cita.id} />
                            <input type="hidden" name="estado" value="Confirmada" />
                            <button type="submit" className="btn" style={{ fontSize: '0.73rem', padding: '0.25rem 0.55rem' }}>
                              Confirmar
                            </button>
                          </form>
                        )}
                        {cita.estado === 'Confirmada' && (
                          <form action={cambiarEstado}>
                            <input type="hidden" name="id" value={cita.id} />
                            <input type="hidden" name="estado" value="Completada" />
                            <button
                              type="submit"
                              className="btn btn-amarillo"
                              style={{ fontSize: '0.73rem', padding: '0.25rem 0.55rem' }}
                              onClick={(e) => { if (!confirm('¿Marcar esta cita como completada?')) e.preventDefault() }}
                            >
                              Completar
                            </button>
                          </form>
                        )}
                        {(cita.estado === 'Pendiente' || cita.estado === 'Confirmada') && (
                          <a
                            href={`/admin/citas?rechazar=${cita.id}`}
                            className="btn btn-peligro"
                            style={{ fontSize: '0.73rem', padding: '0.25rem 0.55rem' }}
                          >
                            Rechazar
                          </a>
                        )}
                        {(cita.estado === 'Pendiente' || cita.estado === 'Confirmada') && (
                          <form action={cambiarEstado}>
                            <input type="hidden" name="id" value={cita.id} />
                            <input type="hidden" name="estado" value="Cancelada" />
                            <button
                              type="submit"
                              className="btn btn-secundario"
                              style={{ fontSize: '0.73rem', padding: '0.25rem 0.55rem' }}
                              onClick={(e) => { if (!confirm('¿Cancelar esta cita?')) e.preventDefault() }}
                            >
                              Cancelar
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
