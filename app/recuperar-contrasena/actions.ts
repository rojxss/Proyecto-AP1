'use server'

import { createClient } from '@/lib/supabase/server'
import { mensajeErrorAmigable } from '@/lib/utils'

export async function solicitarRecuperacionAction(formData: FormData) {
  const correo = (formData.get('correo') as string)?.trim().toLowerCase()

  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { error: 'Ingrese un correo electrónico válido.' }
  }

  const supabase = await createClient()

  // La URL de redirección debe coincidir con la ruta configurada en Supabase Auth → URL Configuration
  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/auth/callback?next=/recuperar-contrasena/nueva`

  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: redirectUrl,
  })

  if (error) {
    // No revelar si el correo existe o no (seguridad)
    console.error('[auth] Error reset password:', error.message)
  }

  // Siempre responder "OK" para no filtrar si el correo está registrado
  return { ok: true }
}

export async function actualizarContrasenaAction(formData: FormData) {
  const nueva = formData.get('contrasena') as string
  const confirmacion = formData.get('confirmacion') as string

  if (!nueva || nueva.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }
  if (nueva !== confirmacion) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password: nueva })

  if (error) {
    return { error: mensajeErrorAmigable(error.code ?? 'default') }
  }

  // Cerrar todas las sesiones anteriores al cambiar contraseña
  await supabase.auth.signOut({ scope: 'others' })

  return { ok: true }
}
