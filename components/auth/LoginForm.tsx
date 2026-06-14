/**
 * Formulario de login (cliente). Llama a la Server Action para autenticar.
 * Maneja estado de carga y muestra errores sin exponer detalles técnicos.
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/login/actions'

export default function LoginForm() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const resultado = await loginAction(formData)

    if (resultado?.error) {
      setError(resultado.error)
      setCargando(false)
    }
    // Si no hay error, la Server Action hizo redirect; no necesita más acciones
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alerta-error" role="alert">{error}</div>
      )}

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

      <div className="campo">
        <label htmlFor="contrasena">Contraseña</label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          disabled={cargando}
        />
      </div>

      <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.4rem' }} disabled={cargando}>
        {cargando ? 'Ingresando…' : 'Iniciar sesión'}
      </button>

      <Link href="/recuperar-contrasena" className="olvide">
        ¿Olvidó su contraseña?
      </Link>

      <style>{`
        .olvide { display: block; text-align: center; margin-top: 1rem; font-size: .88rem; }
      `}</style>
    </form>
  )
}
