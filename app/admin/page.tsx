/**
 * AdminDashboardPage — /admin
 * Panel resumen: conteos clave, citas pendientes y publicaciones recientes.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { EstadoCita, TipoPost } from '@/types/database'

interface ResumenCita {
  id: string
  fecha: string
  estado: EstadoCita
  padre: { nombre_completo: string }
  funcionario: { nombre_completo: string }
  bloque: { etiqueta: string }
}

interface ResumenPost {
  id: string
  tipo: TipoPost
  titulo: string
  created_at: string
  autor: { nombre_completo: string }
}

function ChipEstado({ estado }: { estado: EstadoCita }) {
  return <span className={`chip-estado ${estado}`}>{estado}</span>
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Conteos en paralelo
  const [
    { count: totalPadres },
    { count: totalDocentes },
    { count: totalEstudiantes },
    { count: citasPendientes },
    { data: citasRecientesRaw },
    { data: postsRecientesRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'padre').eq('activo', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'docente').eq('activo', true),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('estado', 'Pendiente'),
    supabase.from('appointments')
      .select(`id, fecha, estado, padre:profiles!padre_id(nombre_completo), funcionario:profiles!funcionario_id(nombre_completo), bloque:time_blocks(etiqueta)`)
      .in('estado', ['Pendiente', 'Confirmada'])
      .order('fecha', { ascending: true })
      .limit(6),
    supabase.from('posts')
      .select(`id, tipo, titulo, created_at, autor:profiles!autor_id(nombre_completo)`)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const citasRecientes = (citasRecientesRaw ?? []) as unknown as ResumenCita[]
  const postsRecientes = (postsRecientesRaw ?? []) as unknown as ResumenPost[]

  const tarjetas = [
    { label: 'Padres activos', valor: totalPadres ?? 0, color: 'var(--verde-700)', href: '/admin/usuarios' },
    { label: 'Docentes activos', valor: totalDocentes ?? 0, color: 'var(--azul)', href: '/admin/usuarios' },
    { label: 'Estudiantes', valor: totalEstudiantes ?? 0, color: 'var(--verde-900)', href: '/admin/usuarios' },
    { label: 'Citas pendientes', valor: citasPendientes ?? 0, color: 'var(--rojo)', href: '/admin/citas' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.2rem' }}>Panel de administración</h1>

      {/* Tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {tarjetas.map(t => (
          <a
            key={t.label}
            href={t.href}
            style={{ textDecoration: 'none' }}
          >
            <div className="bloque-card" style={{ textAlign: 'center', borderTop: `4px solid ${t.color}`, marginBottom: 0 }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: t.color, fontFamily: 'var(--display)' }}>
                {t.valor}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)', marginTop: '0.2rem' }}>{t.label}</div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.4rem' }}>
        {/* Citas activas */}
        <div className="bloque-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h2 style={{ fontSize: '1.05rem' }}>Citas activas</h2>
            <a href="/admin/citas" style={{ fontSize: '0.8rem' }}>Ver todas →</a>
          </div>
          {citasRecientes.length === 0 ? (
            <div className="mensaje-vacio" style={{ fontSize: '0.85rem' }}>No hay citas activas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {citasRecientes.map(c => (
                <div key={c.id} style={{ borderBottom: '1px solid var(--linea)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' — '}{c.bloque?.etiqueta}
                    </span>
                    <ChipEstado estado={c.estado} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--tinta-suave)', marginTop: '0.15rem' }}>
                    {c.padre?.nombre_completo} → {c.funcionario?.nombre_completo}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Publicaciones recientes */}
        <div className="bloque-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <h2 style={{ fontSize: '1.05rem' }}>Publicaciones recientes</h2>
            <a href="/admin/publicaciones" style={{ fontSize: '0.8rem' }}>Ver todas →</a>
          </div>
          {postsRecientes.length === 0 ? (
            <div className="mensaje-vacio" style={{ fontSize: '0.85rem' }}>No hay publicaciones.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {postsRecientes.map(p => (
                <div key={p.id} style={{ borderBottom: '1px solid var(--linea)', paddingBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{p.titulo}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--tinta-suave)', marginTop: '0.1rem' }}>
                    {p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)} · {p.autor?.nombre_completo} ·{' '}
                    {new Date(p.created_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
