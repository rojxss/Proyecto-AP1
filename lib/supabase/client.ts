/**
 * Cliente Supabase para el navegador (componentes cliente).
 * Usa @supabase/ssr para manejar cookies de sesión correctamente en Next.js.
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
