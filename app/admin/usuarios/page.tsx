/**
 * UsuariosAdminPage — /admin/usuarios
 * Gestión completa de usuarios (crear, activar/desactivar),
 * estudiantes (crear) y vínculos padre↔estudiante.
 * RF-02, RF-03, RF-17
 */
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Rol } from '@/types/database'

// ── Server Actions ────────────────────────────────────────────────────────────

async function crearUsuario(formData: FormData) {
  'use server'
  const supabase      = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email          = (formData.get('email') as string)?.trim().toLowerCase()
  const password       = formData.get('password') as string
  const nombre_completo = (formData.get('nombre_completo') as string)?.trim()
  const rol            = formData.get('rol') as Rol

  if (!email || !password || !nombre_completo || !rol) return
  if (password.length < 8) return

  // Crear usuario en Supabase Auth (el trigger handle_new_user crea el perfil)
  await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { rol, nombre_completo },
  })

  revalidatePath('/admin/usuarios')
}

async function toggleActivoUsuario(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const nuevoActivo = formData.get('activo') === 'true'
  if (!id) return

  await supabase.from('profiles').update({ activo: nuevoActivo }).eq('id', id)

  revalidatePath('/admin/usuarios')
}

async function crearEstudiante(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nombre_completo = (formData.get('nombre_completo') as string)?.trim()
  const nivel           = (formData.get('nivel') as string)?.trim()
  const grupo           = (formData.get('grupo') as string)?.trim()

  if (!nombre_completo || !nivel || !grupo) return

  await supabase.from('students').insert({ nombre_completo, nivel, grupo })

  revalidatePath('/admin/usuarios')
}

async function crearVinculo(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const padre_id      = formData.get('padre_id') as string
  const estudiante_id = formData.get('estudiante_id') as string

  if (!padre_id || !estudiante_id) return

  await supabase.from('parent_student').upsert(
    { padre_id, estudiante_id },
    { onConflict: 'padre_id,estudiante_id', ignoreDuplicates: true }
  )

  revalidatePath('/admin/usuarios')
}

async function eliminarVinculo(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const padre_id      = formData.get('padre_id') as string
  const estudiante_id = formData.get('estudiante_id') as string

  if (!padre_id || !estudiante_id) return

  await supabase.from('parent_student')
    .delete()
    .eq('padre_id', padre_id)
    .eq('estudiante_id', estudiante_id)

  revalidatePath('/admin/usuarios')
}

// ── Tipos locales ────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string
  rol: Rol
  nombre_completo: string
  activo: boolean
  created_at: string
  email?: string
}

interface StudentRow {
  id: string
  nombre_completo: string
  nivel: string
  grupo: string
  activo: boolean
}

interface VinculoRow {
  padre_id: string
  estudiante_id: string
  padre: { nombre_completo: string }
  estudiante: { nombre_completo: string; grupo: string }
}

const LABEL_ROL: Record<Rol, string> = {
  admin: 'Administrador/a',
  docente: 'Docente',
  padre: 'Padre/Madre',
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function UsuariosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const tab = params.tab ?? 'usuarios'

  const [
    { data: perfilesRaw },
    { data: estudiantesRaw },
    { data: vinculosRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('id, rol, nombre_completo, activo, created_at').order('nombre_completo'),
    supabase.from('students').select('id, nombre_completo, nivel, grupo, activo').order('nombre_completo'),
    supabase.from('parent_student').select(`padre_id, estudiante_id, padre:profiles!padre_id(nombre_completo), estudiante:students!estudiante_id(nombre_completo, grupo)`),
  ])

  const perfiles    = (perfilesRaw ?? []) as ProfileRow[]
  const estudiantes = (estudiantesRaw ?? []) as StudentRow[]
  const vinculos    = (vinculosRaw ?? []) as unknown as VinculoRow[]

  const padres   = perfiles.filter(p => p.rol === 'padre')
  const docentes = perfiles.filter(p => p.rol === 'docente')
  const admins   = perfiles.filter(p => p.rol === 'admin')

  const TABS = [
    { id: 'usuarios', label: `Usuarios (${perfiles.length})` },
    { id: 'estudiantes', label: `Estudiantes (${estudiantes.length})` },
    { id: 'vinculos', label: `Vínculos (${vinculos.length})` },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Usuarios y vínculos</h1>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
        Gestione cuentas, estudiantes y los vínculos entre padres e hijos.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid var(--linea)', paddingBottom: '0.6rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <a
            key={t.id}
            href={`/admin/usuarios?tab=${t.id}`}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: tab === t.id ? 700 : 400,
              background: tab === t.id ? 'var(--verde-700)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--tinta)',
              fontSize: '0.88rem',
            }}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* ── TAB: USUARIOS ──────────────────────────────────────────────── */}
      {tab === 'usuarios' && (
        <div>
          {/* Formulario crear usuario */}
          <div className="bloque-card" style={{ marginBottom: '1.4rem' }}>
            <h2 style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>Crear nuevo usuario</h2>
            <form action={crearUsuario}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                <div className="campo">
                  <label htmlFor="nombre_completo">Nombre completo *</label>
                  <input id="nombre_completo" name="nombre_completo" type="text" required maxLength={120} placeholder="Juan Pérez Mora" />
                </div>
                <div className="campo">
                  <label htmlFor="email">Correo electrónico *</label>
                  <input id="email" name="email" type="email" required maxLength={120} placeholder="correo@ejemplo.com" />
                </div>
                <div className="campo">
                  <label htmlFor="password">Contraseña inicial *</label>
                  <input id="password" name="password" type="password" required minLength={8} maxLength={72} placeholder="Mínimo 8 caracteres" />
                </div>
                <div className="campo">
                  <label htmlFor="rol">Rol *</label>
                  <select id="rol" name="rol" required defaultValue="padre">
                    <option value="padre">Padre / Madre de familia</option>
                    <option value="docente">Docente</option>
                    <option value="admin">Administrador/a</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--tinta-suave)', margin: '0.4rem 0' }}>
                El usuario recibirá el correo con sus credenciales. La contraseña puede cambiarse desde recuperar contraseña.
              </p>
              <button type="submit" className="btn">Crear usuario</button>
            </form>
          </div>

          {/* Lista de usuarios por grupo */}
          {[
            { label: 'Administradores', lista: admins },
            { label: 'Docentes', lista: docentes },
            { label: 'Padres de familia', lista: padres },
          ].map(({ label, lista }) => (
            <div key={label} style={{ marginBottom: '1.6rem' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--verde-900)' }}>{label} ({lista.length})</h2>
              {lista.length === 0 ? (
                <div className="mensaje-vacio" style={{ fontSize: '0.85rem' }}>No hay {label.toLowerCase()} registrados.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tabla-base">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map(p => (
                        <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.6 }}>
                          <td style={{ fontSize: '0.85rem' }}>{p.nombre_completo}</td>
                          <td style={{ fontSize: '0.82rem' }}>{LABEL_ROL[p.rol]}</td>
                          <td>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: '99px',
                              padding: '0.15rem 0.6rem',
                              background: p.activo ? 'var(--verde-100)' : '#F3E8E8',
                              color: p.activo ? 'var(--verde-700)' : 'var(--rojo)',
                            }}>
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            {/* No permitir desactivar al propio admin */}
                            {p.id !== user.id && (
                              <form action={toggleActivoUsuario}>
                                <input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="activo" value={String(!p.activo)} />
                                <button
                                  type="submit"
                                  className={p.activo ? 'btn btn-peligro' : 'btn btn-secundario'}
                                  style={{ fontSize: '0.73rem', padding: '0.25rem 0.6rem' }}
                                  onClick={(e) => { if (!confirm(p.activo ? '¿Desactivar esta cuenta? El usuario no podrá ingresar.' : '¿Reactivar esta cuenta?')) e.preventDefault() }}
                                >
                                  {p.activo ? 'Desactivar' : 'Reactivar'}
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: ESTUDIANTES ────────────────────────────────────────────── */}
      {tab === 'estudiantes' && (
        <div>
          <div className="bloque-card" style={{ marginBottom: '1.4rem' }}>
            <h2 style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>Agregar estudiante</h2>
            <form action={crearEstudiante}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
                <div className="campo">
                  <label htmlFor="est_nombre">Nombre completo *</label>
                  <input id="est_nombre" name="nombre_completo" type="text" required maxLength={120} placeholder="María García Mora" />
                </div>
                <div className="campo">
                  <label htmlFor="nivel">Nivel *</label>
                  <input id="nivel" name="nivel" type="text" required maxLength={40} placeholder="3.º grado" />
                </div>
                <div className="campo">
                  <label htmlFor="grupo">Grupo *</label>
                  <input id="grupo" name="grupo" type="text" required maxLength={20} placeholder="3-2" />
                </div>
              </div>
              <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>Agregar estudiante</button>
            </form>
          </div>

          {estudiantes.length === 0 ? (
            <div className="mensaje-vacio">No hay estudiantes registrados.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tabla-base">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Nivel</th>
                    <th>Grupo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map(e => (
                    <tr key={e.id} style={{ opacity: e.activo ? 1 : 0.6 }}>
                      <td style={{ fontSize: '0.85rem' }}>{e.nombre_completo}</td>
                      <td style={{ fontSize: '0.82rem' }}>{e.nivel}</td>
                      <td style={{ fontSize: '0.82rem' }}>{e.grupo}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: '99px', padding: '0.15rem 0.6rem', background: e.activo ? 'var(--verde-100)' : '#F3E8E8', color: e.activo ? 'var(--verde-700)' : 'var(--rojo)' }}>
                          {e.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: VÍNCULOS ───────────────────────────────────────────────── */}
      {tab === 'vinculos' && (
        <div>
          <div className="bloque-card" style={{ marginBottom: '1.4rem' }}>
            <h2 style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>Vincular padre con estudiante</h2>
            <form action={crearVinculo}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                <div className="campo">
                  <label htmlFor="padre_id">Padre / Madre *</label>
                  <select id="padre_id" name="padre_id" required defaultValue="">
                    <option value="">Seleccione</option>
                    {padres.filter(p => p.activo).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre_completo}</option>
                    ))}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="estudiante_id">Estudiante *</label>
                  <select id="estudiante_id" name="estudiante_id" required defaultValue="">
                    <option value="">Seleccione</option>
                    {estudiantes.filter(e => e.activo).map(e => (
                      <option key={e.id} value={e.id}>{e.nombre_completo} ({e.grupo})</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn" style={{ marginTop: '0.5rem' }}>Crear vínculo</button>
            </form>
          </div>

          {vinculos.length === 0 ? (
            <div className="mensaje-vacio">No hay vínculos registrados.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tabla-base">
                <thead>
                  <tr>
                    <th>Padre / Madre</th>
                    <th>Estudiante</th>
                    <th>Grupo</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {vinculos.map(v => (
                    <tr key={`${v.padre_id}_${v.estudiante_id}`}>
                      <td style={{ fontSize: '0.85rem' }}>{v.padre?.nombre_completo}</td>
                      <td style={{ fontSize: '0.85rem' }}>{v.estudiante?.nombre_completo}</td>
                      <td style={{ fontSize: '0.82rem' }}>{v.estudiante?.grupo}</td>
                      <td>
                        <form action={eliminarVinculo}>
                          <input type="hidden" name="padre_id" value={v.padre_id} />
                          <input type="hidden" name="estudiante_id" value={v.estudiante_id} />
                          <button
                            type="submit"
                            className="btn btn-peligro"
                            style={{ fontSize: '0.73rem', padding: '0.25rem 0.6rem' }}
                            onClick={(e) => { if (!confirm('¿Eliminar este vínculo? El padre perderá acceso a la información del estudiante.')) e.preventDefault() }}
                          >
                            Desvincular
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
