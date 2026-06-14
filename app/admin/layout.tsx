/**
 * Layout para /admin/* — verifica sesión y rol 'admin' en el servidor.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HeaderInstitucional from '@/components/layout/HeaderInstitucional'
import Sidebar from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre_completo, activo')
    .eq('id', user.id)
    .single()

  if (!profile?.activo) {
    await supabase.auth.signOut()
    redirect('/login?error=cuenta_inactiva')
  }
  if (profile.rol !== 'admin') redirect('/login')

  const [{ data: infos }, { count: pendientesSolicitudes }] = await Promise.all([
    supabase
      .from('institution_info')
      .select('clave, valor')
      .in('clave', ['nombre', 'lugar', 'fundacion', 'circuito']),
    supabase
      .from('access_requests')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente'),
  ])

  const get = (clave: string) => infos?.find(i => i.clave === clave)?.valor ?? ''

  return (
    <>
      <HeaderInstitucional
        nombre={get('nombre') || 'Escuela Villas de Ayarco'}
        lugar={get('lugar') || 'La Unión de Cartago'}
        fundacion={get('fundacion') || '1991'}
        circuito={get('circuito') || ''}
        autenticado
      />
      <div className="layout-app">
        <Sidebar nombreUsuario={profile.nombre_completo} rol="admin" badgeUsuarios={pendientesSolicitudes ?? 0} />
        <main className="contenido-app">{children}</main>
      </div>
    </>
  )
}
