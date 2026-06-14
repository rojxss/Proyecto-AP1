/**
 * SolicitarAccesoPage — /solicitar-acceso
 * Formulario público para que un padre/tutor solicite acceso a la plataforma.
 * No requiere autenticación. El admin revisa y aprueba desde /admin/usuarios.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HeaderInstitucional from '@/components/layout/HeaderInstitucional'

async function enviarSolicitud(formData: FormData) {
  'use server'
  const supabase = await createClient()

  const nombre_completo  = (formData.get('nombre_completo') as string)?.trim()
  const correo           = (formData.get('correo') as string)?.trim().toLowerCase()
  const telefono         = (formData.get('telefono') as string)?.trim() || null
  const info_adicional   = (formData.get('info_adicional') as string)?.trim() || null

  if (!nombre_completo || !correo) return

  await supabase.from('access_requests').insert({
    nombre_completo,
    correo,
    telefono,
    info_adicional,
  })

  redirect('/solicitar-acceso?exito=1')
}

export default async function SolicitarAccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ exito?: string }>
}) {
  const params = await searchParams
  const exito = params.exito === '1'

  const supabase = await createClient()
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

      <div style={{
        minHeight: '78vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'linear-gradient(160deg, var(--verde-100), var(--crema))',
      }}>
        <div style={{
          background: 'var(--blanco)',
          border: '1px solid var(--linea)',
          borderRadius: 'var(--radio)',
          boxShadow: 'var(--sombra)',
          width: 'min(480px, 100%)',
          padding: '2.2rem',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
            <img
              src="/logo.png"
              alt="Escudo Escuela Villas de Ayarco"
              style={{ width: 56, height: 64, objectFit: 'contain', marginBottom: '0.8rem' }}
            />
            <h1 style={{ fontSize: '1.35rem', marginBottom: '0.3rem' }}>Solicitar acceso</h1>
            <p style={{ color: 'var(--tinta-suave)', fontSize: '0.88rem' }}>
              Complete el formulario y la administración de la escuela le enviará sus datos de acceso al correo indicado.
            </p>
          </div>

          {exito ? (
            <div style={{
              background: 'var(--verde-100)',
              border: '1px solid var(--verde-700)',
              borderRadius: 'var(--radio)',
              padding: '1.2rem',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--verde-700)', marginBottom: '0.4rem' }}>
                ¡Solicitud enviada!
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--tinta-suave)' }}>
                La administración revisará su solicitud y le enviará sus datos de acceso al correo que indicó.
                Esto puede tomar uno o dos días hábiles.
              </p>
              <a href="/" className="btn" style={{ marginTop: '1rem', display: 'inline-block' }}>
                Volver al inicio
              </a>
            </div>
          ) : (
            <form action={enviarSolicitud} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="campo">
                <label htmlFor="nombre_completo">Nombre completo *</label>
                <input
                  id="nombre_completo"
                  name="nombre_completo"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ej: María González Pérez"
                />
              </div>

              <div className="campo">
                <label htmlFor="correo">Correo electrónico *</label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  required
                  maxLength={120}
                  placeholder="su.correo@ejemplo.com"
                />
                <span style={{ fontSize: '0.77rem', color: 'var(--tinta-suave)', marginTop: '0.2rem' }}>
                  A esta dirección le llegará su contraseña provisional.
                </span>
              </div>

              <div className="campo">
                <label htmlFor="telefono">Teléfono (opcional)</label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  maxLength={20}
                  placeholder="8888-8888"
                />
              </div>

              <div className="campo">
                <label htmlFor="info_adicional">Nombre del estudiante o información adicional (opcional)</label>
                <textarea
                  id="info_adicional"
                  name="info_adicional"
                  rows={3}
                  maxLength={400}
                  placeholder="Ej: Mi hijo es Juan Pérez, 3.º grado grupo 3-2"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn" style={{ marginTop: '0.3rem' }}>
                Enviar solicitud
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--tinta-suave)' }}>
                ¿Ya tiene cuenta?{' '}
                <a href="/login" style={{ color: 'var(--verde-700)' }}>Ingresar aquí</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
