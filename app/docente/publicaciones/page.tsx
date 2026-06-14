/**
 * PublicacionesDocentePage — /docente/publicaciones
 * El docente publica actividades, eventos y comunicados para sus grupos.
 * RF-09, RF-10, RF-12, RF-13
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

  const tipo       = formData.get('tipo') as TipoPost
  const titulo     = (formData.get('titulo') as string)?.trim()
  const contenido  = (formData.get('contenido') as string)?.trim() || null
  const segmento   = formData.get('segmento') as SegmentoPost
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

  revalidatePath('/docente/publicaciones')
  revalidatePath('/padre/publicaciones')
}

async function eliminarPost(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  // Solo puede eliminar sus propias publicaciones
  await supabase.from('posts').delete().eq('id', id).eq('autor_id', user.id)

  revalidatePath('/docente/publicaciones')
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
}

const TIPOS: TipoPost[] = ['actividad', 'evento', 'comunicado']
const LABELS: Record<TipoPost, string> = { actividad: 'Actividad', evento: 'Evento', comunicado: 'Comunicado' }

export default async function PublicacionesDocentePage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const tipoForm = (params.tipo ?? 'actividad') as TipoPost

  // Solo publicaciones del docente autenticado
  const { data: postsRaw } = await supabase
    .from('posts')
    .select('id, tipo, titulo, contenido, fecha_asignacion, fecha_limite, fecha_evento, hora_evento, lugar, segmento, segmento_valor, created_at')
    .eq('autor_id', user.id)
    .order('created_at', { ascending: false })

  const posts = (postsRaw ?? []) as PostRow[]

  // Grupos de los estudiantes del docente (para sugerir segmentación)
  const { data: gruposRaw } = await supabase
    .from('schedule_entries')
    .select('grupo')
    .eq('docente_id', user.id)

  const grupos = [...new Set((gruposRaw ?? []).map(g => g.grupo as string))].sort()

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Publicaciones</h1>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
        Publique actividades, eventos y comunicados para los padres de sus grupos.
      </p>

      {/* Formulario nueva publicación */}
      <div className="bloque-card" style={{ marginBottom: '1.6rem' }}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>Nueva publicación</h2>

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {TIPOS.map(t => (
            <a key={t} href={`/docente/publicaciones?tipo=${t}`} className={`chip-hijo ${tipoForm === t ? 'activo' : ''}`} style={{ textDecoration: 'none' }}>
              {LABELS[t]}
            </a>
          ))}
        </div>

        <form action={crearPost}>
          <input type="hidden" name="tipo" value={tipoForm} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="titulo">Título *</label>
              <input id="titulo" name="titulo" type="text" maxLength={120} required placeholder={`Título del ${LABELS[tipoForm].toLowerCase()}`} />
            </div>
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="contenido">Descripción</label>
              <textarea id="contenido" name="contenido" rows={3} style={{ resize: 'vertical' }} />
            </div>

            {tipoForm === 'actividad' && (
              <>
                <div className="campo">
                  <label htmlFor="fecha_asignacion">Fecha de asignación</label>
                  <input id="fecha_asignacion" name="fecha_asignacion" type="date" />
                </div>
                <div className="campo">
                  <label htmlFor="fecha_limite">Fecha límite de entrega</label>
                  <input id="fecha_limite" name="fecha_limite" type="date" />
                </div>
              </>
            )}

            {tipoForm === 'evento' && (
              <>
                <div className="campo">
                  <label htmlFor="fecha_evento">Fecha del evento</label>
                  <input id="fecha_evento" name="fecha_evento" type="date" />
                </div>
                <div className="campo">
                  <label htmlFor="hora_evento">Hora</label>
                  <input id="hora_evento" name="hora_evento" type="time" />
                </div>
                <div className="campo">
                  <label htmlFor="lugar">Lugar</label>
                  <input id="lugar" name="lugar" type="text" maxLength={120} placeholder="Ej: Aula 204" />
                </div>
              </>
            )}

            <div className="campo">
              <label htmlFor="segmento">Destinatarios *</label>
              <select id="segmento" name="segmento" required defaultValue="grupo">
                <option value="todos">Toda la institución</option>
                <option value="grupo">Un grupo específico</option>
                <option value="nivel">Un nivel específico</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="segmento_valor">Grupo o nivel (si aplica)</label>
              <input id="segmento_valor" name="segmento_valor" type="text" list="mis-grupos" placeholder="Ej: 3-2" />
              <datalist id="mis-grupos">
                {grupos.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
          </div>
          <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>Publicar</button>
        </form>
      </div>

      {/* Lista de publicaciones propias */}
      <h2 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>Mis publicaciones</h2>
      {posts.length === 0 ? (
        <div className="mensaje-vacio">Aún no ha creado publicaciones.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {posts.map(post => (
            <div key={post.id} className="bloque-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--verde-100)', color: 'var(--verde-700)', borderRadius: '99px', padding: '0.15rem 0.65rem' }}>
                  {LABELS[post.tipo]}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)' }}>
                  {new Date(post.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h3 style={{ fontSize: '0.95rem', marginTop: '0.4rem', marginBottom: '0.2rem' }}>{post.titulo}</h3>
              {post.contenido && (
                <p style={{ fontSize: '0.84rem', color: 'var(--tinta-suave)', marginBottom: '0.3rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.contenido}
                </p>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)', marginBottom: '0.5rem' }}>
                {post.segmento === 'todos' ? 'Toda la institución' : `${post.segmento === 'nivel' ? 'Nivel' : 'Grupo'}: ${post.segmento_valor}`}
              </div>
              <form action={eliminarPost} style={{ display: 'inline' }}>
                <input type="hidden" name="id" value={post.id} />
                <ConfirmButton
                  className="btn btn-peligro"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  mensaje="¿Eliminar esta publicación?"
                >
                  Eliminar
                </ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
