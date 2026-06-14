/**
 * Middleware de Next.js — control de acceso por rol.
 * Se ejecuta en cada request antes de que llegue a las páginas.
 *
 * Flujo:
 * 1. Refresca la sesión de Supabase (renovar tokens vencidos)
 * 2. Rutas públicas → pasar sin verificar
 * 3. Rutas protegidas → verificar sesión y rol; redirigir si no corresponde
 */
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rutas que no requieren autenticación
const RUTAS_PUBLICAS = ['/', '/login', '/recuperar-contrasena']
// Prefijos de rutas por rol
const RUTAS_ROL: Record<string, string> = {
  '/padre': 'padre',
  '/docente': 'docente',
  '/admin': 'admin',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Siempre refrescar sesión para mantener tokens actualizados
  const resultado = await updateSession(request)

  // Si updateSession devolvió una redirección (cuenta inactiva), respetarla
  if (resultado instanceof NextResponse) return resultado

  const { response, user, rol } = resultado

  // Rutas públicas: acceso libre
  if (RUTAS_PUBLICAS.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    // Si ya tiene sesión y va a /login, redirigir al inicio de su rol
    if (user && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL(redirectPorRol(rol), request.url))
    }
    return response
  }

  // Rutas del callback de auth: acceso libre
  if (pathname.startsWith('/api/auth')) return response

  // Rutas protegidas: requieren sesión
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificar que el rol corresponde a la ruta
  for (const [prefijo, rolRequerido] of Object.entries(RUTAS_ROL)) {
    if (pathname.startsWith(prefijo) && rol !== rolRequerido) {
      // Redirigir al inicio del rol correcto
      return NextResponse.redirect(new URL(redirectPorRol(rol), request.url))
    }
  }

  return response
}

function redirectPorRol(rol: string | null): string {
  switch (rol) {
    case 'padre': return '/padre/horario'
    case 'docente': return '/docente/citas'
    case 'admin': return '/admin'
    default: return '/login'
  }
}

// Supabase SSR requiere Node.js runtime (usa process.version internamente)
export const runtime = 'nodejs'

export const config = {
  matcher: [
    /*
     * Ejecutar en todas las rutas excepto archivos estáticos y _next
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
