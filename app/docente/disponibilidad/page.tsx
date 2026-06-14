/**
 * DisponibilidadDocentePage — /docente/disponibilidad
 * El docente activa o bloquea bloques horarios por día.
 * Sin disponibilidad activa, los padres no pueden ver bloques al agendar citas.
 * RF-07, RF-13
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DiaSemana, TimeBlock, StaffAvailability } from '@/types/database'

// ── Server Action ─────────────────────────────────────────────────────────────

async function toggleBloque(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dia      = formData.get('dia') as DiaSemana
  const bloque_id = formData.get('bloque_id') as string
  const nuevoValor = formData.get('nuevo_valor') === 'true'

  if (!dia || !bloque_id) return

  // UPSERT: inserta o actualiza la disponibilidad
  await supabase.from('staff_availability').upsert(
    { funcionario_id: user.id, dia, bloque_id, disponible: nuevoValor },
    { onConflict: 'funcionario_id,dia,bloque_id' }
  )

  revalidatePath('/docente/disponibilidad')
  revalidatePath('/padre/citas')
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

const DIAS: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// ── Página ────────────────────────────────────────────────────────────────────

export default async function DisponibilidadDocentePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Cargar bloques lectivos (sin recesos ni almuerzo)
  const { data: bloquesRaw } = await supabase
    .from('time_blocks')
    .select('id, etiqueta, orden, es_receso, es_almuerzo')
    .order('orden')

  const bloques = (bloquesRaw ?? []) as TimeBlock[]
  const bloquesLectivos = bloques.filter(b => !b.es_receso && !b.es_almuerzo)

  // Cargar disponibilidad actual del docente
  const { data: disponibilidadRaw } = await supabase
    .from('staff_availability')
    .select('id, dia, bloque_id, disponible')
    .eq('funcionario_id', user.id)

  const disponibilidad = (disponibilidadRaw ?? []) as Pick<StaffAvailability, 'id' | 'dia' | 'bloque_id' | 'disponible'>[]

  // Mapa rápido para lookup: "dia_bloqueId" → disponible
  const disponibleMap: Record<string, boolean> = {}
  for (const d of disponibilidad) {
    disponibleMap[`${d.dia}_${d.bloque_id}`] = d.disponible
  }

  const totalActivos = disponibilidad.filter(d => d.disponible).length

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Mi disponibilidad para citas</h1>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        Active los bloques en los que puede atender citas. Los padres solo verán los bloques marcados como disponibles.
      </p>
      <p style={{ fontSize: '0.85rem', marginBottom: '1.4rem' }}>
        <strong style={{ color: 'var(--verde-700)' }}>{totalActivos}</strong> bloque{totalActivos !== 1 ? 's' : ''} disponible{totalActivos !== 1 ? 's' : ''} en total.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="tabla-base" style={{ minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ width: '120px', background: 'var(--amarillo-suave)' }}>Bloque</th>
              {DIAS.map(d => (
                <th key={d} style={{ textAlign: 'center', background: 'var(--amarillo-suave)' }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloquesLectivos.map(bloque => (
              <tr key={bloque.id}>
                <td style={{ fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap', background: 'var(--crema)' }}>
                  {bloque.etiqueta}
                </td>
                {DIAS.map(dia => {
                  const key = `${dia}_${bloque.id}`
                  const estaActivo = disponibleMap[key] === true
                  const nuevoValor = !estaActivo

                  return (
                    <td key={dia} style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <form action={toggleBloque}>
                        <input type="hidden" name="dia" value={dia} />
                        <input type="hidden" name="bloque_id" value={bloque.id} />
                        <input type="hidden" name="nuevo_valor" value={String(nuevoValor)} />
                        <button
                          type="submit"
                          title={estaActivo ? 'Clic para bloquear' : 'Clic para activar'}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '1rem',
                            background: estaActivo ? 'var(--verde-700)' : 'var(--linea)',
                            color: estaActivo ? '#fff' : 'var(--tinta-suave)',
                            transition: 'background 0.15s',
                          }}
                        >
                          {estaActivo ? '✓' : '–'}
                        </button>
                      </form>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bloque-card" style={{ marginTop: '1.6rem', background: 'var(--verde-100)', borderColor: 'var(--verde-700)' }}>
        <p style={{ fontSize: '0.88rem', color: 'var(--verde-900)' }}>
          <strong>¿Cómo funciona?</strong><br />
          <span style={{ display: 'block', marginTop: '0.3rem' }}>
            ✓ <strong>Verde</strong> = disponible para citas en ese día y bloque.<br />
            – <strong>Gris</strong> = no disponible; los padres no verán ese bloque.<br />
            Los cambios se aplican de inmediato.
          </span>
        </p>
      </div>
    </div>
  )
}
