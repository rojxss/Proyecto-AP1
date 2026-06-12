/**
 * Server Actions para autenticación.
 * La validación se hace del lado del servidor antes de llamar a Supabase.
 */
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { mensajeErrorAmigable } from '@/lib/utils'

export async function loginAction(formData: FormData) {
  const correo = (formData.get('correo') as string)?.trim().toLowerCase()
  const contrasena = formData.get('contrasena') as string

  // Validación básica del lado del servidor
  if (!correo || !contrasena) {
    return { error: 'Debe ingresar su correo y contraseña.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { error: 'Ingrese un correo electrónico válido.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  })

  if (error) {
    return { error: mensajeErrorAmigable(error.code ?? error.message) }
  }

  // Obtener rol para redirigir al inicio correcto
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: mensajeErrorAmigable() }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, activo')
    .eq('id', user.id)
    .single()

  if (!profile?.activo) {
    await supabase.auth.signOut()
    return { error: mensajeErrorAmigable('cuenta_inactiva') }
  }

  const destinos: Record<string, string> = {
    padre: '/padre/horario',
    docente: '/docente/citas',
    admin: '/admin',
  }

  redirect(destinos[profile.rol] ?? '/')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
