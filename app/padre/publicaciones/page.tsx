/**
 * PublicacionesPadrePage — /padre/publicaciones
 * El padre ve publicaciones segmentadas a los grupos/niveles de sus hijos.
 * RF-09, RF-10, RF-11, RF-12, RF-14
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { TipoPost } from '@/types/database'

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
  segmento: string
  segmento_valor: string | null
  created_at: string
  updated_at: string
  autor: { nombre_completo: string }
}

function etiquetaTipo(tipo: TipoPost): string {
  return tipo === 'actividad' ? 'Actividad' : tipo === 'evento' ? 'Evento' : 'Comunicado'
}

function colorTipo(tipo: TipoPost): string {
  if (tipo === 'actividad') return 'var(--azul)'
  if (tipo === 'evento') return 'var(--verde-700)'
  return 'var(--gris)'
}

function bgTipo(tipo: TipoPost): string {
  if (tipo === 'actividad') return '#E1ECF7'
  if (tipo === 'evento') return 'var(--verde-100)'
  return '#EEF0EE'
}

const TIPOS: TipoPost[] = ['actividad', 'evento', 'comunicado']

export default async function PublicacionesPadrePage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; desde?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const tipoFiltro = (params.tipo ?? '') as TipoPost | ''
  const desdeFiltro = params.desde ?? ''

  // Cargar publicaciones — la RLS filtra automáticamente por los grupos del padre
  let query = supabase
    .from('posts')
    .select(`
      id, tipo, titulo, contenido,
      fecha_asignacion, fecha_limite,
      fecha_evento, hora_evento, lugar,
      segmento, segmento_valor, created_at, updated_at,
      autor:profiles!autor_id ( nombre_completo )
    `)
    .order('created_at', { ascending: false })

  if (tipoFiltro) {
    query = query.eq('tipo', tipoFiltro)
  }
  if (desdeFiltro) {
    query = query.gte('created_at', desdeFiltro + 'T00:00:00')
  }

  const { data: postsRaw } = await query
  const posts = (postsRaw ?? []) as unknown as PostRow[]

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Actividades, eventos y comunicados</h1>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
        Publicaciones correspondientes a los grupos de sus hijos, en orden más reciente primero.
      </p>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>Tipo:</span>
        <a
          href={`/padre/publicaciones${desdeFiltro ? `?desde=${desdeFiltro}` : ''}`}
          className={`chip-hijo ${!tipoFiltro ? 'activo' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          Todos
        </a>
        {TIPOS.map(t => (
          <a
            key={t}
            href={`/padre/publicaciones?tipo=${t}${desdeFiltro ? `&desde=${desdeFiltro}` : ''}`}
            className={`chip-hijo ${tipoFiltro === t ? 'activo' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            {etiquetaTipo(t)}
          </a>
        ))}

        <span style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)', marginLeft: '0.5rem' }}>Desde:</span>
        <form method="GET" action="/padre/publicaciones" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {tipoFiltro && <input type="hidden" name="tipo" value={tipoFiltro} />}
          <input
            type="date"
            name="desde"
            defaultValue={desdeFiltro}
            style={{ fontSize: '0.82rem', padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid var(--linea)' }}
          />
          <button type="submit" className="btn btn-secundario" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
            Filtrar
          </button>
          {desdeFiltro && (
            <a
              href={`/padre/publicaciones${tipoFiltro ? `?tipo=${tipoFiltro}` : ''}`}
              style={{ fontSize: '0.8rem', color: 'var(--tinta-suave)' }}
            >
              Limpiar
            </a>
          )}
        </form>
      </div>

      {posts.length === 0 ? (
        <div className="mensaje-vacio">
          No hay publicaciones disponibles{tipoFiltro ? ` del tipo "${etiquetaTipo(tipoFiltro)}"` : ''}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map(post => (
            <article key={post.id} className="bloque-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: bgTipo(post.tipo),
                    color: colorTipo(post.tipo),
                    borderRadius: '99px',
                    padding: '0.2rem 0.75rem',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                  }}>
                    {etiquetaTipo(post.tipo)}
                  </span>
                  {post.segmento !== 'todos' && post.segmento_valor && (
                    <span style={{ fontSize: '0.76rem', color: 'var(--tinta-suave)', background: 'var(--crema)', border: '1px solid var(--linea)', borderRadius: '99px', padding: '0.15rem 0.6rem' }}>
                      {post.segmento === 'nivel' ? 'Nivel' : 'Grupo'}: {post.segmento_valor}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.76rem', color: 'var(--tinta-suave)', whiteSpace: 'nowrap' }}>
                  {new Date(post.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <h2 style={{ fontSize: '1.05rem', marginTop: '0.6rem', marginBottom: '0.4rem' }}>
                {post.titulo}
              </h2>

              {post.contenido && (
                <p style={{ fontSize: '0.9rem', color: 'var(--tinta)', lineHeight: 1.6 }}>
                  {post.contenido}
                </p>
              )}

              {/* Campos específicos por tipo */}
              {post.tipo === 'actividad' && (post.fecha_asignacion || post.fecha_limite) && (
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.84rem' }}>
                  {post.fecha_asignacion && (
                    <span>📅 Asignada: <strong>
                      {new Date(post.fecha_asignacion + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'long' })}
                    </strong></span>
                  )}
                  {post.fecha_limite && (
                    <span>⏰ Entrega: <strong style={{ color: 'var(--rojo)' }}>
                      {new Date(post.fecha_limite + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong></span>
                  )}
                </div>
              )}

              {post.tipo === 'evento' && (post.fecha_evento || post.lugar) && (
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.84rem' }}>
                  {post.fecha_evento && (
                    <span>📅 Fecha: <strong>
                      {new Date(post.fecha_evento + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {post.hora_evento && ` a las ${post.hora_evento.slice(0, 5)}`}
                    </strong></span>
                  )}
                  {post.lugar && <span>📍 Lugar: <strong>{post.lugar}</strong></span>}
                </div>
              )}

              <div style={{ marginTop: '0.6rem', fontSize: '0.76rem', color: 'var(--tinta-suave)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>Por: {post.autor?.nombre_completo}</span>
                {post.updated_at !== post.created_at && (
                  <span>
                    Actualizado: {new Date(post.updated_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
