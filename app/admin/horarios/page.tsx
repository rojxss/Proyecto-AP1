/**
 * HorariosAdminPage — /admin/horarios
 * CRUD completo de schedule_entries.
 * Server Component con formularios manejados por Server Actions.
 *
 * Requerimientos: RF-05, RNF-04, RNF-06, RNF-09
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DiaSemana, TimeBlock, ScheduleEntry } from '@/types/database'
import ConfirmButton from '@/components/ui/ConfirmButton'

// ── Server Actions ────────────────────────────────────────────────────────────

async function crearEntrada(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const grupo     = (formData.get('grupo') as string)?.trim()
  const dia       = formData.get('dia') as DiaSemana
  const bloque_id = formData.get('bloque_id') as string
  const materia   = (formData.get('materia') as string)?.trim()
  const docente_id = (formData.get('docente_id') as string) || null
  const aula      = (formData.get('aula') as string)?.trim() ?? ''

  if (!grupo || !dia || !bloque_id || !materia) return

  // Verificar duplicado (grupo + día + bloque)
  const { data: existe } = await supabase
    .from('schedule_entries')
    .select('id')
    .eq('grupo', grupo)
    .eq('dia', dia)
    .eq('bloque_id', bloque_id)
    .maybeSingle()

  if (existe) return // La restricción UNIQUE de la DB también protege esto

  await supabase.from('schedule_entries').insert({
    grupo,
    dia,
    bloque_id,
    materia,
    docente_id: docente_id || null,
    aula,
  })

  revalidatePath('/admin/horarios')
  revalidatePath('/padre/horario')
}

async function eliminarEntrada(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('schedule_entries').delete().eq('id', id)

  revalidatePath('/admin/horarios')
  revalidatePath('/padre/horario')
}

async function editarEntrada(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id       = formData.get('id') as string
  const materia  = (formData.get('materia') as string)?.trim()
  const docente_id = (formData.get('docente_id') as string) || null
  const aula     = (formData.get('aula') as string)?.trim() ?? ''

  if (!id || !materia) return

  await supabase
    .from('schedule_entries')
    .update({ materia, docente_id: docente_id || null, aula })
    .eq('id', id)

  revalidatePath('/admin/horarios')
  revalidatePath('/padre/horario')
}

// ── Tipos de datos compuestos ──────────────────────────────────────────────

interface EntradaConDetalles extends ScheduleEntry {
  bloque: Pick<TimeBlock, 'etiqueta' | 'orden'>
  docente: { nombre_completo: string } | null
}

interface DocenteRow {
  id: string
  nombre_completo: string
}

const DIAS: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

// ── Página ─────────────────────────────────────────────────────────────────

export default async function HorariosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; editar?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const grupoFiltro = params.grupo ?? ''
  const editarId = params.editar ?? ''

  // Cargar time_blocks (solo los que no son receso/almuerzo)
  const { data: bloques } = await supabase
    .from('time_blocks')
    .select('id, etiqueta, orden, es_receso, es_almuerzo')
    .eq('es_receso', false)
    .eq('es_almuerzo', false)
    .order('orden')

  // Cargar docentes
  const { data: docentes } = await supabase
    .from('profiles')
    .select('id, nombre_completo')
    .eq('rol', 'docente')
    .eq('activo', true)
    .order('nombre_completo')

  // Cargar entradas (filtradas por grupo si se seleccionó)
  let query = supabase
    .from('schedule_entries')
    .select(`
      id, grupo, dia, bloque_id, materia, docente_id, aula, updated_at,
      bloque:time_blocks ( etiqueta, orden ),
      docente:profiles ( nombre_completo )
    `)
    .order('grupo')

  if (grupoFiltro) {
    query = query.eq('grupo', grupoFiltro)
  }

  const { data: entradasRaw } = await query
  const entradas = (entradasRaw ?? []) as unknown as EntradaConDetalles[]

  // Grupos únicos para el filtro
  const { data: todosGrupos } = await supabase
    .from('students')
    .select('grupo')
    .eq('activo', true)

  const grupos = [...new Set((todosGrupos ?? []).map(s => s.grupo as string))].sort()

  // Entrada en edición (si hay ?editar=id)
  const entradaEditar = editarId
    ? entradas.find(e => e.id === editarId)
    : null

  // Agrupar entradas por grupo y día para la vista de tabla
  const porGrupo: Record<string, Record<DiaSemana, EntradaConDetalles[]>> = {}
  for (const e of entradas) {
    if (!porGrupo[e.grupo]) {
      porGrupo[e.grupo] = {
        Lunes: [], Martes: [], 'Miércoles': [], Jueves: [], Viernes: [],
      }
    }
    porGrupo[e.grupo][e.dia].push(e)
  }

  return (
    <div>
      <div className="titulo-seccion">
        <h1>Gestión de horarios</h1>
      </div>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
        Administre las entradas del horario semanal por grupo. Los cambios se reflejan inmediatamente en la vista de los padres.
      </p>

      {/* ── Formulario: Nueva entrada ─────────────────────────────────── */}
      <div className="bloque-card" style={{ marginBottom: '1.6rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          {entradaEditar ? 'Editar entrada' : 'Agregar entrada al horario'}
        </h2>

        {entradaEditar ? (
          /* Formulario de edición (solo cambia materia, docente y aula) */
          <form action={editarEntrada}>
            <input type="hidden" name="id" value={entradaEditar.id} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
              <div className="campo">
                <label>Grupo</label>
                <input type="text" value={entradaEditar.grupo} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="campo">
                <label>Día</label>
                <input type="text" value={entradaEditar.dia} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="campo">
                <label>Bloque</label>
                <input type="text" value={entradaEditar.bloque?.etiqueta ?? ''} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="campo">
                <label htmlFor="edit-materia">Materia *</label>
                <input
                  id="edit-materia"
                  name="materia"
                  type="text"
                  defaultValue={entradaEditar.materia}
                  maxLength={80}
                  required
                  placeholder="Ej: Matemáticas"
                />
              </div>
              <div className="campo">
                <label htmlFor="edit-docente">Docente</label>
                <select id="edit-docente" name="docente_id" defaultValue={entradaEditar.docente_id ?? ''}>
                  <option value="">Sin asignar</option>
                  {(docentes as DocenteRow[] ?? []).map(d => (
                    <option key={d.id} value={d.id}>{d.nombre_completo}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="edit-aula">Aula</label>
                <input
                  id="edit-aula"
                  name="aula"
                  type="text"
                  defaultValue={entradaEditar.aula}
                  maxLength={40}
                  placeholder="Ej: 204"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn">Guardar cambios</button>
              <a href="/admin/horarios" className="btn btn-secundario">Cancelar</a>
            </div>
          </form>
        ) : (
          /* Formulario de creación */
          <form action={crearEntrada}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
              <div className="campo">
                <label htmlFor="grupo">Grupo *</label>
                <select id="grupo" name="grupo" required defaultValue={grupoFiltro}>
                  <option value="">Seleccione</option>
                  {grupos.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="dia">Día *</label>
                <select id="dia" name="dia" required>
                  <option value="">Seleccione</option>
                  {DIAS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="bloque_id">Bloque *</label>
                <select id="bloque_id" name="bloque_id" required>
                  <option value="">Seleccione</option>
                  {(bloques ?? []).map(b => (
                    <option key={b.id} value={b.id}>{b.etiqueta}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="materia">Materia *</label>
                <input
                  id="materia"
                  name="materia"
                  type="text"
                  maxLength={80}
                  required
                  placeholder="Ej: Matemáticas"
                />
              </div>
              <div className="campo">
                <label htmlFor="docente_id">Docente</label>
                <select id="docente_id" name="docente_id">
                  <option value="">Sin asignar</option>
                  {(docentes as DocenteRow[] ?? []).map(d => (
                    <option key={d.id} value={d.id}>{d.nombre_completo}</option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="aula">Aula</label>
                <input
                  id="aula"
                  name="aula"
                  type="text"
                  maxLength={40}
                  placeholder="Ej: 204"
                />
              </div>
            </div>
            <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>
              Agregar entrada
            </button>
          </form>
        )}
      </div>

      {/* ── Filtro por grupo ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--tinta-suave)' }}>Filtrar por grupo:</span>
        <a
          href="/admin/horarios"
          className={`chip-hijo ${!grupoFiltro ? 'activo' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          Todos
        </a>
        {grupos.map(g => (
          <a
            key={g}
            href={`/admin/horarios?grupo=${g}`}
            className={`chip-hijo ${grupoFiltro === g ? 'activo' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            {g}
          </a>
        ))}
      </div>

      {/* ── Tabla de entradas ─────────────────────────────────────────── */}
      {entradas.length === 0 ? (
        <div className="mensaje-vacio">
          {grupoFiltro
            ? `No hay entradas de horario para el grupo ${grupoFiltro}.`
            : 'No hay entradas de horario registradas. Agregue la primera entrada arriba.'}
        </div>
      ) : (
        Object.entries(porGrupo)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([grupo, diasMap]) => {
            const todasLasEntradas = Object.values(diasMap).flat()
            const lastUpdated = todasLasEntradas.length > 0
              ? new Date(Math.max(...todasLasEntradas.map(e => new Date(e.updated_at).getTime())))
              : null

            return (
              <div key={grupo} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <h2 style={{ fontSize: '1.05rem' }}>Grupo {grupo}</h2>
                  {lastUpdated && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)' }}>
                      Última modificación: {lastUpdated.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tabla-base">
                    <thead>
                      <tr>
                        <th>Bloque</th>
                        {DIAS.map(d => <th key={d}>{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(bloques ?? []).map(bloque => {
                        return (
                          <tr key={bloque.id}>
                            <td style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', background: 'var(--amarillo-suave)' }}>
                              {bloque.etiqueta}
                            </td>
                            {DIAS.map(dia => {
                              const entrada = diasMap[dia]?.find(e => e.bloque_id === bloque.id)
                              if (!entrada) {
                                return (
                                  <td key={dia} style={{ background: 'var(--crema)', verticalAlign: 'top' }}>
                                    <a
                                      href={`/admin/horarios?grupo=${grupo}#form`}
                                      style={{ fontSize: '0.72rem', color: 'var(--tinta-suave)', textDecoration: 'none' }}
                                    >
                                      + agregar
                                    </a>
                                  </td>
                                )
                              }
                              return (
                                <td key={dia} style={{ verticalAlign: 'top', minWidth: '120px' }}>
                                  <strong style={{ display: 'block', fontSize: '0.84rem', color: 'var(--verde-900)' }}>
                                    {entrada.materia}
                                  </strong>
                                  {entrada.docente && (
                                    <span style={{ fontSize: '0.74rem', color: 'var(--tinta-suave)', display: 'block' }}>
                                      {entrada.docente.nombre_completo}
                                    </span>
                                  )}
                                  {entrada.aula && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--tinta-suave)', display: 'block' }}>
                                      Aula {entrada.aula}
                                    </span>
                                  )}
                                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem' }}>
                                    <a
                                      href={`/admin/horarios?grupo=${grupo}&editar=${entrada.id}`}
                                      style={{ fontSize: '0.72rem', color: 'var(--verde-700)' }}
                                    >
                                      editar
                                    </a>
                                    <span style={{ color: 'var(--linea)' }}>|</span>
                                    <form action={eliminarEntrada} style={{ display: 'inline' }}>
                                      <input type="hidden" name="id" value={entrada.id} />
                                      <ConfirmButton
                                        style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--rojo)', cursor: 'pointer', padding: 0 }}
                                        mensaje="¿Eliminar esta entrada del horario?"
                                      >
                                        eliminar
                                      </ConfirmButton>
                                    </form>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
      )}
    </div>
  )
}
