/**
 * Layout para /docente/* — verifica sesión y rol 'docente' en el servidor.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HeaderInstitucional from '@/components/layout/HeaderInstitucional'
import Sidebar from '@/components/layout/Sidebar'

export default async function DocenteLayout({ children }: { children: React.ReactNode }) {
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
  if (profile.rol !== 'docente') redirect('/login')

  const { data: infos } = await supabase
    .from('institution_info')
    .select('clave, valor')
    .in('clave', ['nombre', 'lugar', 'fundacion', 'circuito'])

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
        <Sidebar nombreUsuario={profile.nombre_completo} rol="docente" />
        <main className="contenido-app">{children}</main>
      </div>
    </>
  )
}
