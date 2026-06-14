/**
 * PublicacionesAdminPage — /admin/publicaciones
 * CRUD completo de posts (actividad, evento, comunicado) con segmentación.
 * RF-09, RF-10, RF-11, RF-12, RF-13
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TipoPost, SegmentoPost } from '@/types/database'
import ConfirmButton from '@/components/ui/ConfirmButton'

// ── Server Actions ────────────────────────────────────────────────────────────

async function crearPost(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tipo      = formData.get('tipo') as TipoPost
  const titulo    = (formData.get('titulo') as string)?.trim()
  const contenido = (formData.get('contenido') as string)?.trim() || null
  const segmento  = formData.get('segmento') as SegmentoPost
  const segmento_valor = (formData.get('segmento_valor') as string)?.trim() || null

  if (!tipo || !titulo || !segmento) return

  const extra: Record<string, string | null> = {}
  if (tipo === 'actividad') {
    extra.fecha_asignacion = (formData.get('fecha_asignacion') as string) || null
    extra.fecha_limite     = (formData.get('fecha_limite') as string) || null
  } else if (tipo === 'evento') {
    extra.fecha_evento = (formData.get('fecha_evento') as string) || null
    extra.hora_evento  = (formData.get('hora_evento') as string) || null
    extra.lugar        = (formData.get('lugar') as string)?.trim() || null
  }

  await supabase.from('posts').insert({
    tipo, titulo, contenido,
    segmento,
    segmento_valor: segmento === 'todos' ? null : segmento_valor,
    autor_id: user.id,
    ...extra,
  })

  revalidatePath('/admin/publicaciones')
  revalidatePath('/padre/publicaciones')
  revalidatePath('/docente/publicaciones')
}

async function editarPost(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id       = formData.get('id') as string
  const titulo   = (formData.get('titulo') as string)?.trim()
  const contenido = (formData.get('contenido') as string)?.trim() || null
  const segmento = formData.get('segmento') as SegmentoPost
  const segmento_valor = (formData.get('segmento_valor') as string)?.trim() || null
  const tipo     = formData.get('tipo') as TipoPost

  if (!id || !titulo) return

  const extra: Record<string, string | null> = {}
  if (tipo === 'actividad') {
    extra.fecha_asignacion = (formData.get('fecha_asignacion') as string) || null
    extra.fecha_limite     = (formData.get('fecha_limite') as string) || null
  } else if (tipo === 'evento') {
    extra.fecha_evento = (formData.get('fecha_evento') as string) || null
    extra.hora_evento  = (formData.get('hora_evento') as string) || null
    extra.lugar        = (formData.get('lugar') as string)?.trim() || null
  }

  await supabase.from('posts').update({
    titulo, contenido,
    segmento,
    segmento_valor: segmento === 'todos' ? null : segmento_valor,
    ...extra,
  }).eq('id', id)

  revalidatePath('/admin/publicaciones')
  revalidatePath('/padre/publicaciones')
}

async function eliminarPost(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('posts').delete().eq('id', id)

  revalidatePath('/admin/publicaciones')
  revalidatePath('/padre/publicaciones')
}

// ── Tipos locales ────────────────────────────────────────────────────────────

interface PostRow {
  id: string
  tipo: TipoPost
  titulo: string
  contenido: string | null
  fecha_asignacion: string | null
  fecha_limite: string | null
  fecha_evento: string | null
  hora_evento: string | null
  lugar: string | null
  segmento: SegmentoPost
  segmento_valor: string | null
  created_at: string
  updated_at: string
  autor: { nombre_completo: string }
}

const TIPOS: TipoPost[] = ['actividad', 'evento', 'comunicado']
const LABELS_TIPO: Record<TipoPost, string> = { actividad: 'Actividad', evento: 'Evento', comunicado: 'Comunicado' }

// ── Página ────────────────────────────────────────────────────────────────────

export default async function PublicacionesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; editar?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const tipoForm = (params.tipo ?? 'comunicado') as TipoPost
  const editarId = params.editar ?? ''

  // Cargar posts
  const { data: postsRaw } = await supabase
    .from('posts')
    .select(`id, tipo, titulo, contenido, fecha_asignacion, fecha_limite, fecha_evento, hora_evento, lugar, segmento, segmento_valor, created_at, updated_at, autor:profiles!autor_id(nombre_completo)`)
    .order('created_at', { ascending: false })

  const posts = (postsRaw ?? []) as unknown as PostRow[]

  // Grupos y niveles únicos para segmentación
  const { data: estudiantesRaw } = await supabase
    .from('students')
    .select('nivel, grupo')
    .eq('activo', true)

  const nivelesSet = new Set<string>()
  const gruposSet  = new Set<string>()
  for (const s of (estudiantesRaw ?? [])) {
    if (s.nivel) nivelesSet.add(s.nivel)
    if (s.grupo) gruposSet.add(s.grupo)
  }
  const niveles = [...nivelesSet].sort()
  const grupos  = [...gruposSet].sort()

  const postEditar = editarId ? posts.find(p => p.id === editarId) : null
  const tipoEditar = postEditar?.tipo ?? tipoForm

  return (
    <div>
      <div className="titulo-seccion">
        <h1>Publicaciones</h1>
      </div>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
        Cree y gestione actividades, eventos y comunicados para padres de familia.
      </p>

      {/* ── Formulario ──────────────────────────────────────────────────── */}
      <div className="bloque-card" style={{ marginBottom: '1.6rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.6rem' }}>
          {postEditar ? 'Editar publicación' : 'Nueva publicación'}
        </h2>

        {/* Selector de tipo (solo al crear) */}
        {!postEditar && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {TIPOS.map(t => (
              <a
                key={t}
                href={`/admin/publicaciones?tipo=${t}`}
                className={`chip-hijo ${tipoForm === t ? 'activo' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                {LABELS_TIPO[t]}
              </a>
            ))}
          </div>
        )}

        <form action={postEditar ? editarPost : crearPost}>
          {postEditar && <input type="hidden" name="id" value={postEditar.id} />}
          <input type="hidden" name="tipo" value={tipoEditar} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="titulo">Título *</label>
              <input id="titulo" name="titulo" type="text" maxLength={120} required defaultValue={postEditar?.titulo ?? ''} placeholder={`Título del ${LABELS_TIPO[tipoEditar].toLowerCase()}`} />
            </div>

            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="contenido">Descripción / contenido</label>
              <textarea id="contenido" name="contenido" rows={3} style={{ resize: 'vertical' }} defaultValue={postEditar?.contenido ?? ''} />
            </div>

            {/* Campos de Actividad */}
            {tipoEditar === 'actividad' && (
              <>
                <div className="campo">
                  <label htmlFor="fecha_asignacion">Fecha de asignación</label>
                  <input id="fecha_asignacion" name="fecha_asignacion" type="date" defaultValue={postEditar?.fecha_asignacion ?? ''} />
                </div>
                <div className="campo">
                  <label htmlFor="fecha_limite">Fecha límite de entrega</label>
                  <input id="fecha_limite" name="fecha_limite" type="date" defaultValue={postEditar?.fecha_limite ?? ''} />
                </div>
              </>
            )}

            {/* Campos de Evento */}
            {tipoEditar === 'evento' && (
              <>
                <div className="campo">
                  <label htmlFor="fecha_evento">Fecha del evento *</label>
                  <input id="fecha_evento" name="fecha_evento" type="date" defaultValue={postEditar?.fecha_evento ?? ''} />
                </div>
                <div className="campo">
                  <label htmlFor="hora_evento">Hora</label>
                  <input id="hora_evento" name="hora_evento" type="time" defaultValue={postEditar?.hora_evento?.slice(0, 5) ?? ''} />
                </div>
                <div className="campo">
                  <label htmlFor="lugar">Lugar</label>
                  <input id="lugar" name="lugar" type="text" maxLength={120} defaultValue={postEditar?.lugar ?? ''} placeholder="Ej: Gimnasio" />
                </div>
              </>
            )}

            {/* Segmentación */}
            <div className="campo">
              <label htmlFor="segmento">Destinatarios *</label>
              <select id="segmento" name="segmento" required defaultValue={postEditar?.segmento ?? 'todos'}>
                <option value="todos">Toda la institución</option>
                <option value="nivel">Un nivel específico</option>
                <option value="grupo">Un grupo específico</option>
              </select>
            </div>

            <div className="campo">
              <label htmlFor="segmento_valor">Nivel o grupo (si aplica)</label>
              <input
                id="segmento_valor"
                name="segmento_valor"
                type="text"
                list="opciones-segmento"
                defaultValue={postEditar?.segmento_valor ?? ''}
                placeholder="Ej: 3.º grado o 3-2"
              />
              <datalist id="opciones-segmento">
                {niveles.map(n => <option key={n} value={n} />)}
                {grupos.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn">{postEditar ? 'Guardar cambios' : 'Publicar'}</button>
            {postEditar && <a href="/admin/publicaciones" className="btn btn-secundario">Cancelar</a>}
          </div>
        </form>
      </div>

      {/* ── Lista de publicaciones ──────────────────────────────────────── */}
      {posts.length === 0 ? (
        <div className="mensaje-vacio">No hay publicaciones. Cree la primera usando el formulario de arriba.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {posts.map(post => (
            <div key={post.id} className="bloque-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--verde-100)', color: 'var(--verde-700)', borderRadius: '99px', padding: '0.15rem 0.65rem', marginRight: '0.5rem' }}>
                    {LABELS_TIPO[post.tipo]}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)' }}>
                    {post.segmento === 'todos' ? 'Toda la institución' : `${post.segmento === 'nivel' ? 'Nivel' : 'Grupo'}: ${post.segmento_valor}`}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)', whiteSpace: 'nowrap' }}>
                  {new Date(post.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <h3 style={{ fontSize: '1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>{post.titulo}</h3>
              {post.contenido && (
                <p style={{ fontSize: '0.85rem', color: 'var(--tinta)', marginBottom: '0.4rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.contenido}
                </p>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)', marginBottom: '0.5rem' }}>
                Por: {post.autor?.nombre_completo}
                {post.updated_at !== post.created_at && (
                  <span> · Editado: {new Date(post.updated_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={`/admin/publicaciones?editar=${post.id}`} className="btn btn-secundario" style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}>
                  Editar
                </a>
                <form action={eliminarPost} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={post.id} />
                  <ConfirmButton
                    className="btn btn-peligro"
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                    mensaje="¿Eliminar esta publicación? Esta acción no se puede deshacer."
                  >
                    Eliminar
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
