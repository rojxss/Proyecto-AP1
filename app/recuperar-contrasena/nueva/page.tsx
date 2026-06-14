/**
 * Formulario para ingresar la nueva contraseña.
 * Solo accesible desde el link enviado por correo (sesión temporal de Supabase).
 */
import HeaderInstitucional from '@/components/layout/HeaderInstitucional'
import NuevaContrasenaForm from '@/components/auth/NuevaContrasenaForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function NuevaContrasenaPage() {
  const supabase = await createClient()

  // Si no hay sesión temporal (el link ya venció o no se llegó por el link), redirigir
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/recuperar-contrasena?error=link_vencido')
  }

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
      />
      <div className="login-fondo">
        <div className="login-caja">
          <div className="escudo-logo" style={{ margin: '0 auto 1rem', width: 58, height: 66 }}>
            <img src="/logo.png" alt="Escudo Escuela Villas de Ayarco" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1>Nueva contraseña</h1>
          <p className="login-sub">Ingrese y confirme su nueva contraseña.</p>
          <NuevaContrasenaForm />
        </div>
      </div>
      <style>{`
        .login-fondo { min-height: 78vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(160deg, var(--verde-100), var(--crema)); }
        .login-caja { background: var(--blanco); border: 1px solid var(--linea); border-radius: var(--radio); box-shadow: var(--sombra); width: min(400px, 100%); padding: 2.2rem; }
        .login-caja h1 { font-size: 1.45rem; text-align: center; margin-bottom: .3rem; }
        .login-sub { text-align: center; color: var(--tinta-suave); font-size: .9rem; margin-bottom: 1.5rem; }
      `}</style>
    </>
  )
}
