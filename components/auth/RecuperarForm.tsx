'use client'

import { useState } from 'react'
import Link from 'next/link'
import { solicitarRecuperacionAction } from '@/app/recuperar-contrasena/actions'

export default function RecuperarForm() {
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const resultado = await solicitarRecuperacionAction(formData)

    if (resultado?.error) {
      setError(resultado.error)
      setCargando(false)
    } else {
      setEnviado(true)
    }
  }

  if (enviado) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✉️</p>
        <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Revise su correo</p>
        <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
          Si existe una cuenta con ese correo, recibirá un enlace para restablecer su contraseña.
          El enlace vence en 30 minutos.
        </p>
        <Link href="/login" className="btn" style={{ display: 'inline-block' }}>
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alerta-error" role="alert">{error}</div>}

      <div className="campo">
        <label htmlFor="correo">Correo electrónico</label>
        <input
          id="correo"
          name="correo"
          type="email"
          placeholder="nombre@correo.com"
          autoComplete="email"
          required
          disabled={cargando}
        />
      </div>

      <button type="submit" className="btn" style={{ width: '100%' }} disabled={cargando}>
        {cargando ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <Link href="/login" style={{ fontSize: '0.88rem' }}>
          Volver al inicio de sesión
        </Link>
      </div>
    </form>
  )
}
