'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { mensajeErrorAmigable } from '@/lib/utils'
import { notificarRecuperacionContrasena } from '@/lib/email'

// URL base: en Vercel se define en env vars; localmente usa localhost.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://escuela-villas-de-ayarco.vercel.app'

export async function solicitarRecuperacionAction(formData: FormData) {
  const correo = (formData.get('correo') as string)?.trim().toLowerCase()

  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { error: 'Ingrese un correo electrónico válido.' }
  }

  // Supabase usa flujo implícito para recovery links de Admin API:
  // redirige con #access_token= en el fragmento → se necesita página cliente.
  // redirectTo debe estar en Supabase → Auth → URL Configuration → Redirect URLs.
  const redirectTo = `${SITE_URL}/recuperar-contrasena/confirmar`

  try {
    const adminSupabase = await createAdminClient()

    // generateLink genera el enlace SIN enviar correo — lo enviamos nosotros via Gmail
    const { data, error } = await adminSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: correo,
      options: { redirectTo },
    })

    if (error) {
      // No revelar si el correo existe (seguridad)
      console.error('[auth] generateLink error:', error.message)
    } else if (data?.properties?.action_link) {
      const nombre = (data.user?.user_metadata?.nombre_completo as string | undefined) ?? 'Usuario'
      await notificarRecuperacionContrasena({
        email: correo,
        nombre,
        enlace: data.properties.action_link,
      })
    }
  } catch (err) {
    console.error('[auth] Error en recuperación:', err)
  }

  // Siempre "OK" para no filtrar si el correo está registrado
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
