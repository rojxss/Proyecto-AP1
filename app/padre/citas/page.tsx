/**
 * CitasPadrePage — /padre/citas
 * Vista para que el padre vea sus citas, agende nuevas y las cancele.
 * RF-06, RF-07, RF-08, RF-15, RF-20
 */
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatearFecha } from '@/lib/utils'
import { notificarNuevaCita, notificarCambioCita } from '@/lib/email'
import type { EstadoCita, DiaSemana } from '@/types/database'
import ConfirmButton from '@/components/ui/ConfirmButton'

// ── Server Actions ────────────────────────────────────────────────────────────

async function agendarCita(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const funcionario_id = formData.get('funcionario_id') as string
  const fecha          = formData.get('fecha') as string
  const bloque_id      = formData.get('bloque_id') as string
  const motivo         = (formData.get('motivo') as string)?.trim()

  if (!funcionario_id || !fecha || !bloque_id || !motivo) return
  if (motivo.length > 300) return

  // Regla RF-20a: verificar que el bloque no esté ocupado por otra cita activa
  const { data: conflictoBloque } = await supabase
    .from('appointments')
    .select('id')
    .eq('funcionario_id', funcionario_id)
    .eq('fecha', fecha)
    .eq('bloque_id', bloque_id)
    .in('estado', ['Pendiente', 'Confirmada'])
    .maybeSingle()

  if (conflictoBloque) return // bloque ocupado

  // Regla RF-20b: no más de una cita activa con el mismo funcionario en la misma fecha
  const { data: conflictoPadre } = await supabase
    .from('appointments')
    .select('id')
    .eq('padre_id', user.id)
    .eq('funcionario_id', funcionario_id)
    .eq('fecha', fecha)
    .in('estado', ['Pendiente', 'Confirmada'])
    .maybeSingle()

  if (conflictoPadre) return // ya tiene cita activa ese día con ese funcionario

  await supabase.from('appointments').insert({
    padre_id: user.id,
    funcionario_id,
    fecha,
    bloque_id,
    motivo,
    estado: 'Pendiente',
  })

  // Notificación por correo a ambas partes
  try {
    const adminClient = await createAdminClient()
    const [{ data: datosPadre }, { data: datosFuncionario }, { data: bloqueDatos }] = await Promise.all([
      adminClient.auth.admin.getUserById(user.id),
      adminClient.auth.admin.getUserById(funcionario_id),
      supabase.from('time_blocks').select('etiqueta').eq('id', bloque_id).single(),
    ])
    const { data: perfilFuncionario } = await supabase
      .from('profiles').select('nombre_completo').eq('id', funcionario_id).single()
    const { data: perfilPadre } = await supabase
      .from('profiles').select('nombre_completo').eq('id', user.id).single()

    if (datosPadre?.user?.email && datosFuncionario?.user?.email) {
      await notificarNuevaCita({
        emailPadre: datosPadre.user.email,
        emailFuncionario: datosFuncionario.user.email,
        nombrePadre: perfilPadre?.nombre_completo ?? 'Padre/Madre',
        nombreFuncionario: perfilFuncionario?.nombre_completo ?? 'Funcionario/a',
        fecha: formatearFecha(fecha),
        bloque: bloqueDatos?.etiqueta ?? bloque_id,
        motivo,
      })
    }
  } catch {
    // No interrumpir el flujo si el correo falla
  }

  revalidatePath('/padre/citas')
  revalidatePath('/docente/citas')
}

async function cancelarCita(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  // Solo puede cancelar sus propias citas que no estén completadas
  const { data: cita } = await supabase
    .from('appointments')
    .select('estado, padre_id')
    .eq('id', id)
    .single()

  if (!cita || cita.padre_id !== user.id) return
  if (cita.estado === 'Completada') return

  await supabase
    .from('appointments')
    .update({ estado: 'Cancelada' })
    .eq('id', id)

  // Notificar al funcionario que la cita fue cancelada
  try {
    const adminClient = await createAdminClient()
    const { data: citaCompleta } = await supabase
      .from('appointments')
      .select(`funcionario_id, fecha, bloque:time_blocks(etiqueta), funcionario:profiles!funcionario_id(nombre_completo)`)
      .eq('id', id).single()
    const { data: perfilPadre } = await supabase
      .from('profiles').select('nombre_completo').eq('id', user.id).single()

    if (citaCompleta) {
      const [{ data: datosPadre }, { data: datosFuncionario }] = await Promise.all([
        adminClient.auth.admin.getUserById(user.id),
        adminClient.auth.admin.getUserById(citaCompleta.funcionario_id as string),
      ])
      if (datosPadre?.user?.email && datosFuncionario?.user?.email) {
        const bloqueEtiqueta = (citaCompleta.bloque as { etiqueta?: string } | null)?.etiqueta ?? ''
        const nombreFuncionario = (citaCompleta.funcionario as { nombre_completo?: string } | null)?.nombre_completo ?? ''
        await notificarCambioCita({
          emailPadre: datosPadre.user.email,
          emailFuncionario: datosFuncionario.user.email,
          nombrePadre: perfilPadre?.nombre_completo ?? 'Padre/Madre',
          nombreFuncionario,
          fecha: formatearFecha(citaCompleta.fecha as string),
          bloque: bloqueEtiqueta,
          nuevoEstado: 'Cancelada',
        })
      }
    }
  } catch {
    // No interrumpir el flujo si el correo falla
  }

  revalidatePath('/padre/citas')
  revalidatePath('/docente/citas')
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FuncionarioRow {
  id: string
  nombre_completo: string
  rol: string
}

interface BloqueRow {
  id: string
  etiqueta: string
  orden: number
}

interface CitaRow {
  id: string
  fecha: string
  motivo: string
  estado: EstadoCita
  motivo_rechazo: string | null
  created_at: string
  funcionario: { nombre_completo: string }
  bloque: { etiqueta: string }
}

// ── Componente de chip de estado ─────────────────────────────────────────────

function ChipEstado({ estado }: { estado: EstadoCita }) {
  return <span className={`chip-estado ${estado}`}>{estado}</span>
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function CitasPadrePage({
  searchParams,
}: {
  searchParams: Promise<{ funcionario?: string; fecha?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const funcionarioSel = params.funcionario ?? ''
  const fechaSel       = params.fecha ?? ''

  // Cargar funcionarios (docentes + admin) disponibles para citas
  const { data: funcionariosRaw } = await supabase
    .from('profiles')
    .select('id, nombre_completo, rol')
    .in('rol', ['docente', 'admin'])
    .eq('activo', true)
    .order('nombre_completo')

  const funcionarios = (funcionariosRaw ?? []) as FuncionarioRow[]

  // Cargar bloques disponibles del funcionario en la fecha seleccionada
  let bloquesDisponibles: BloqueRow[] = []

  if (funcionarioSel && fechaSel) {
    // Día de la semana de la fecha seleccionada
    const fechaObj = new Date(fechaSel + 'T12:00:00')
    const diasSemana: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    // getDay(): 0=dom, 1=lun, …, 5=vie, 6=sab
    const diaIdx = fechaObj.getDay()
    if (diaIdx >= 1 && diaIdx <= 5) {
      const dia = diasSemana[diaIdx - 1]

      // Bloques marcados como disponibles por el funcionario
      const { data: disponibles } = await supabase
        .from('staff_availability')
        .select('bloque_id, disponible')
        .eq('funcionario_id', funcionarioSel)
        .eq('dia', dia)
        .eq('disponible', true)

      const bloqueIdsDisponibles = (disponibles ?? []).map((d: { bloque_id: string; disponible: boolean }) => d.bloque_id)

      if (bloqueIdsDisponibles.length > 0) {
        // Excluir bloques ya ocupados ese día
        const { data: ocupados } = await supabase
          .from('appointments')
          .select('bloque_id')
          .eq('funcionario_id', funcionarioSel)
          .eq('fecha', fechaSel)
          .in('estado', ['Pendiente', 'Confirmada'])

        const bloqueIdsOcupados = (ocupados ?? []).map((o: { bloque_id: string }) => o.bloque_id)

        const libres = bloqueIdsDisponibles.filter(
          (bid: string) => !bloqueIdsOcupados.includes(bid)
        )

        if (libres.length > 0) {
          const { data: bloquesDatos } = await supabase
            .from('time_blocks')
            .select('id, etiqueta, orden')
            .in('id', libres)
            .order('orden')

          bloquesDisponibles = (bloquesDatos ?? []) as BloqueRow[]
        }
      }
    }
  }

  // Cargar historial de citas del padre
  const { data: citasRaw } = await supabase
    .from('appointments')
    .select(`
      id, fecha, motivo, estado, motivo_rechazo, created_at,
      funcionario:profiles!funcionario_id ( nombre_completo ),
      bloque:time_blocks ( etiqueta )
    `)
    .eq('padre_id', user.id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  const citas = (citasRaw ?? []) as unknown as CitaRow[]

  // Fecha mínima = hoy
  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Citas</h1>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
        Solicite una cita con un docente o la administración.
      </p>

      {/* ── Formulario de agendamiento ───────────────────────────────── */}
      <div className="bloque-card" style={{ marginBottom: '1.6rem' }}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Agendar nueva cita</h2>

        {/* Paso 1: seleccionar funcionario y fecha */}
        <form method="GET" action="/padre/citas" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
            <div className="campo">
              <label htmlFor="funcionario">Funcionario *</label>
              <select
                id="funcionario"
                name="funcionario"
                defaultValue={funcionarioSel}
                required
                onChange={undefined}
              >
                <option value="">Seleccione un funcionario</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.rol === 'docente' ? 'Docente' : 'Dirección'} — {f.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="fecha">Fecha *</label>
              <input
                id="fecha"
                name="fecha"
                type="date"
                defaultValue={fechaSel}
                min={hoy}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-secundario" style={{ marginTop: '0.3rem' }}>
            Ver disponibilidad
          </button>
        </form>

        {/* Paso 2: mostrar bloques disponibles y formulario de motivo */}
        {funcionarioSel && fechaSel && (
          bloquesDisponibles.length === 0 ? (
            <div className="alerta-error" style={{ marginTop: '0.5rem' }}>
              No hay bloques disponibles para esa fecha con este funcionario.
              Pruebe otra fecha o funcionario.
            </div>
          ) : (
            <form action={agendarCita}>
              <input type="hidden" name="funcionario_id" value={funcionarioSel} />
              <input type="hidden" name="fecha" value={fechaSel} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                <div className="campo">
                  <label htmlFor="bloque_id">Bloque horario *</label>
                  <select id="bloque_id" name="bloque_id" required>
                    <option value="">Seleccione un bloque</option>
                    {bloquesDisponibles.map(b => (
                      <option key={b.id} value={b.id}>{b.etiqueta}</option>
                    ))}
                  </select>
                </div>
                <div className="campo" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="motivo">Motivo de la cita * (máx. 300 caracteres)</label>
                  <textarea
                    id="motivo"
                    name="motivo"
                    rows={3}
                    maxLength={300}
                    required
                    placeholder="Describa brevemente el motivo de la reunión..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--tinta-suave)', marginBottom: '0.6rem' }}>
                Fecha: <strong>{formatearFecha(fechaSel)}</strong> —
                Funcionario: <strong>{funcionarios.find(f => f.id === funcionarioSel)?.nombre_completo}</strong>
              </p>
              <button type="submit" className="btn">Solicitar cita</button>
            </form>
          )
        )}
      </div>

      {/* ── Historial de citas ───────────────────────────────────────── */}
      <h2 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>Mis citas</h2>

      {citas.length === 0 ? (
        <div className="mensaje-vacio">Aún no tiene citas registradas.</div>
      ) : (
        <table className="tabla-base">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Bloque</th>
              <th>Funcionario</th>
              <th>Motivo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {citas.map(cita => (
              <tr key={cita.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                  {new Date(cita.fecha + 'T12:00:00').toLocaleDateString('es-CR', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>
                <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {cita.bloque?.etiqueta}
                </td>
                <td style={{ fontSize: '0.85rem' }}>{cita.funcionario?.nombre_completo}</td>
                <td style={{ fontSize: '0.85rem', maxWidth: '180px' }}>
                  {cita.motivo}
                  {cita.motivo_rechazo && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--rojo)', marginTop: '0.2rem' }}>
                      Motivo rechazo: {cita.motivo_rechazo}
                    </span>
                  )}
                </td>
                <td><ChipEstado estado={cita.estado} /></td>
                <td>
                  {(cita.estado === 'Pendiente' || cita.estado === 'Confirmada') && (
                    <form action={cancelarCita}>
                      <input type="hidden" name="id" value={cita.id} />
                      <ConfirmButton
                        className="btn btn-peligro"
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                        mensaje="¿Cancelar esta cita?"
                      >
                        Cancelar
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
