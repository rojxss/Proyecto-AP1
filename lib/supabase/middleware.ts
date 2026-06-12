/**
 * Helper para refrescar la sesión de Supabase en el middleware de Next.js.
 * Actualiza las cookies de acceso/refresco sin interrumpir la request.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Obtener sesión y perfil del usuario (rol)
  const { data: { user } } = await supabase.auth.getUser()

  let rol: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol, activo')
      .eq('id', user.id)
      .single()

    if (profile?.activo === false) {
      // Cuenta desactivada: cerrar sesión y redirigir a login
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=cuenta_inactiva', request.url))
    }
    rol = profile?.rol ?? null
  }

  return { response: supabaseResponse, user, rol }
}
