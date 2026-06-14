/**
 * Página de login — correo + contraseña.
 * Los padres no se autoregistran; la cuenta la crea el admin.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { mensajeErrorAmigable } from '@/lib/utils'
import HeaderInstitucional from '@/components/layout/HeaderInstitucional'
import LoginForm from '@/components/auth/LoginForm'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  // Si ya tiene sesión, redirigir al inicio de su rol
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const destinos: Record<string, string> = {
      padre: '/padre/horario',
      docente: '/docente/citas',
      admin: '/admin',
    }
    redirect(destinos[profile?.rol ?? ''] ?? '/')
  }

  // Datos institucionales para el header
  const { data: infos } = await supabase
    .from('institution_info')
    .select('clave, valor')
    .in('clave', ['nombre', 'lugar', 'fundacion', 'circuito', 'telefono'])

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
          <div className="escudo-logo" style={{ margin: '0 auto 1rem', width: 58, height: 66, fontSize: '1.2rem' }}>
            VA
          </div>
          <h1>Ingreso a la plataforma</h1>
          <p className="login-sub">
            Padres de familia y personal de {get('nombre') || 'la escuela'}
          </p>

          {error && (
            <div className="alerta-error" role="alert">
              {mensajeErrorAmigable(error)}
            </div>
          )}

          <LoginForm />

          <div className="nota-acceso">
            Las cuentas de padres de familia las crea la escuela. Si aún no tiene
            acceso, comuníquese con la secretaría al {get('telefono') || '2272-4746'}.
          </div>
        </div>
      </div>

      <style>{`
        .login-fondo { min-height: 78vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(160deg, var(--verde-100), var(--crema)); }
        .login-caja { background: var(--blanco); border: 1px solid var(--linea); border-radius: var(--radio); box-shadow: var(--sombra); width: min(400px, 100%); padding: 2.2rem; }
        .login-caja h1 { font-size: 1.45rem; text-align: center; margin-bottom: .3rem; }
        .login-sub { text-align: center; color: var(--tinta-suave); font-size: .9rem; margin-bottom: 1.5rem; }
        .nota-acceso { margin-top: 1.4rem; background: var(--verde-100); border-radius: 10px; padding: .8rem; font-size: .82rem; color: var(--verde-900); }
      `}</style>
    </>
  )
}
