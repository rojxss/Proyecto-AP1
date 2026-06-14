/**
 * Solicitar enlace de recuperación de contraseña.
 * Supabase envía un correo con un link PKCE válido por 30 minutos (configurar en dashboard).
 */
import HeaderInstitucional from '@/components/layout/HeaderInstitucional'
import RecuperarForm from '@/components/auth/RecuperarForm'
import { createClient } from '@/lib/supabase/server'

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: infos } = await supabase
    .from('institution_info')
    .select('clave, valor')
    .in('clave', ['nombre', 'lugar', 'fundacion', 'circuito'])

  const get = (clave: string) => infos?.find(i => i.clave === clave)?.valor ?? ''
  const { error } = await searchParams
  const linkVencido = error === 'link_vencido'

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
          <h1>Recuperar contraseña</h1>
          {linkVencido && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#b91c1c', fontSize: '0.88rem', textAlign: 'center' }}>
              El enlace ha vencido o ya fue utilizado. Solicite uno nuevo a continuación.
            </div>
          )}
          <p className="login-sub">
            Ingrese su correo y le enviaremos un enlace para restablecer su contraseña.
            El enlace es válido por 30 minutos.
          </p>
          <RecuperarForm />
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
