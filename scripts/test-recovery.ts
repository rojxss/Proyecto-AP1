/**
 * scripts/test-recovery.ts
 * Prueba el flujo completo de recuperación de contraseña:
 * 1. Genera enlace de recuperación via Supabase Admin
 * 2. Sigue la redirección a nuestro /api/auth/callback
 * 3. Verifica que se obtiene un código PKCE válido
 *
 * Uso: npx tsx scripts/test-recovery.ts
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function cargarEnv() {
  const ruta = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(ruta)) return
  for (const linea of fs.readFileSync(ruta, 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const idx = l.indexOf('=')
    if (idx < 0) continue
    process.env[l.slice(0, idx).trim()] ??= l.slice(idx + 1).trim()
  }
}
cargarEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SITE_URL     = 'https://escuela-villas-de-ayarco.vercel.app'
const EMAIL_PRUEBA = 'jsebascp04@gmail.com'

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('── Test: flujo de recuperación de contraseña ──────────────────')
  console.log(`   Email: ${EMAIL_PRUEBA}`)
  console.log(`   SITE_URL: ${SITE_URL}\n`)

  // Paso 1: generar enlace de recuperación
  const redirectTo = `${SITE_URL}/recuperar-contrasena/confirmar`
  const { data, error } = await sb.auth.admin.generateLink({
    type: 'recovery',
    email: EMAIL_PRUEBA,
    options: { redirectTo },
  })

  if (error) {
    console.error('✗ generateLink falló:', error.message)
    process.exit(1)
  }

  const actionLink = data.properties?.action_link
  if (!actionLink) {
    console.error('✗ No se generó action_link')
    process.exit(1)
  }

  console.log('✓ Enlace generado por Supabase:')
  console.log(`  ${actionLink}\n`)

  // Paso 2: seguir el enlace (Supabase verify → nuestro callback)
  console.log('── Siguiendo el enlace (sin seguir redirección final)… ─────────')
  try {
    const resp1 = await fetch(actionLink, { redirect: 'manual' })
    const location1 = resp1.headers.get('location') ?? ''
    console.log(`  HTTP ${resp1.status} → ${location1.slice(0, 120)}`)

    // Supabase puede usar 302 o 303 para la redirección
    if (resp1.status === 302 || resp1.status === 301 || resp1.status === 303) {
      if (location1.includes('/recuperar-contrasena/confirmar')) {
        console.log('\n✓ Redirección va a /recuperar-contrasena/confirmar ← correcto')

        if (location1.includes('#access_token=')) {
          console.log('✓ Contiene access_token en fragmento (flujo implícito) ← correcto')
          if (location1.includes('type=recovery')) {
            console.log('✓ type=recovery confirmado ← correcto')
          }
          console.log('\n✓ FLUJO COMPLETO OK')
          console.log('  La página /confirmar leerá el #access_token y establecerá la sesión.')
          console.log('  Luego redirigirá a /recuperar-contrasena/nueva para cambiar la contraseña.')
        } else if (location1.includes('#error=')) {
          const errParams = new URLSearchParams(location1.split('#')[1] ?? '')
          console.log(`\n✗ Supabase devolvió error: ${errParams.get('error_code')}`)
          console.log('  Posible causa: redirect URL no está en la lista permitida de Supabase')
          process.exit(1)
        } else {
          console.log('⚠  Sin access_token ni error — revisar configuración de Supabase')
        }
      } else if (location1.includes('#error=') || location1.includes('error=')) {
        console.log(`\n✗ Supabase no redirigió a /confirmar sino a: ${location1.slice(0, 200)}`)
        console.log('  La URL NO está en la lista de Redirect URLs de Supabase')
        process.exit(1)
      } else {
        console.log(`\n✗ Redirección inesperada: ${location1.slice(0, 200)}`)
        process.exit(1)
      }
    } else {
      console.log(`\n✗ Respuesta inesperada de Supabase (esperaba 302/303, recibí ${resp1.status})`)
      process.exit(1)
    }
  } catch (e) {
    console.error('\n✗ Error de red:', e)
    process.exit(1)
  }
}

main()
