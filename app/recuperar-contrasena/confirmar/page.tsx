'use client'
/**
 * Página intermedia para recuperación de contraseña con flujo implícito de Supabase.
 * Supabase envía access_token y refresh_token como fragmentos de URL (#hash),
 * los cuales solo son accesibles en el cliente. Esta página los lee, establece
 * la sesión y redirige al formulario de nueva contraseña.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmarRecuperacionPage() {
  const [mensaje, setMensaje] = useState('Verificando enlace…')
  const [error, setError]     = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const hash   = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)

    const errorCode  = params.get('error_code')
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const tipo         = params.get('type')

    if (errorCode) {
      setError(true)
      setMensaje(
        errorCode === 'otp_expired'
          ? 'El enlace ha vencido. Solicite uno nuevo a continuación.'
          : 'El enlace no es válido. Solicite uno nuevo.'
      )
      return
    }

    if (!accessToken || !refreshToken || tipo !== 'recovery') {
      setError(true)
      setMensaje('Enlace inválido. Solicite uno nuevo.')
      return
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: err }) => {
        if (err) {
          setError(true)
          setMensaje('El enlace ha vencido o ya fue utilizado. Solicite uno nuevo.')
        } else {
          router.replace('/recuperar-contrasena/nueva')
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, var(--verde-100), var(--crema))', padding: '2rem',
    }}>
      <div style={{
        background: 'var(--blanco)', border: '1px solid var(--linea)', borderRadius: 'var(--radio)',
        boxShadow: 'var(--sombra)', padding: '2.5rem', width: 'min(400px, 100%)', textAlign: 'center',
      }}>
        {error ? (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: 'var(--tinta)' }}>
              Enlace no válido
            </h1>
            <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {mensaje}
            </p>
            <a
              href="/recuperar-contrasena"
              style={{
                display: 'inline-block', background: 'var(--verde-700)', color: '#fff',
                padding: '0.65rem 1.5rem', borderRadius: 8, fontWeight: 600,
                textDecoration: 'none', fontSize: '0.95rem',
              }}
            >
              Solicitar nuevo enlace
            </a>
          </>
        ) : (
          <>
            <div style={{
              width: 40, height: 40, border: '4px solid var(--verde-100)',
              borderTop: '4px solid var(--verde-700)', borderRadius: '50%',
              margin: '0 auto 1.25rem',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'var(--tinta-suave)', fontSize: '0.95rem' }}>{mensaje}</p>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
