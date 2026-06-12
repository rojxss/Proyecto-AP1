'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarContrasenaAction } from '@/app/recuperar-contrasena/actions'

export default function NuevaContrasenaForm() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const resultado = await actualizarContrasenaAction(formData)

    if (resultado?.error) {
      setError(resultado.error)
      setCargando(false)
    } else {
      setExito(true)
      setTimeout(() => router.push('/login'), 2500)
    }
  }

  if (exito) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
        <p style={{ fontWeight: 700 }}>Contraseña actualizada</p>
        <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
          Redirigiendo al inicio de sesión…
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alerta-error" role="alert">{error}</div>}

      <div className="campo">
        <label htmlFor="contrasena">Nueva contraseña</label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={cargando}
        />
      </div>

      <div className="campo">
        <label htmlFor="confirmacion">Confirmar contraseña</label>
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          placeholder="Repita la contraseña"
          autoComplete="new-password"
          required
          disabled={cargando}
        />
      </div>

      <button type="submit" className="btn" style={{ width: '100%' }} disabled={cargando}>
        {cargando ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>
    </form>
  )
}
