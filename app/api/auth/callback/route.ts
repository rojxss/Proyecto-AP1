/**
 * Callback PKCE de Supabase Auth.
 * Maneja el code exchange para recuperación de contraseña y otras redirecciones de auth.
 * Esta URL debe estar registrada en Supabase → Auth → URL Configuration → Redirect URLs.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=link_invalido', origin))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] Error exchange:', error.message)
    return NextResponse.redirect(new URL('/recuperar-contrasena?error=link_vencido', origin))
  }

  // Redirigir a la ruta indicada por el parámetro `next`
  return NextResponse.redirect(new URL(next, origin))
}
