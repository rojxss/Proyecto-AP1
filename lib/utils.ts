/**
 * Utilidades generales del proyecto.
 */

/** Sanitiza texto libre para prevenir XSS antes de almacenarlo */
export function sanitizarTexto(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

/** Formatea una fecha ISO a formato costarricense legible */
export function formatearFecha(fechaISO: string): string {
  const fecha = new Date(fechaISO + 'T00:00:00')
  return fecha.toLocaleDateString('es-CR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Formatea timestamp a "Actualizado el DD mmm YYYY, H:MM a/p. m." */
export function formatearTimestamp(isoString: string): string {
  const fecha = new Date(isoString)
  return `Actualizado el ${fecha.toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}, ${fecha.toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit' })}`
}

/** Trunca texto a n caracteres con elipsis */
export function truncar(texto: string, n: number): string {
  return texto.length <= n ? texto : texto.slice(0, n - 1) + '…'
}

/** Mensajes de error amigables (sin detalles técnicos) */
export function mensajeErrorAmigable(codigo?: string): string {
  const mensajes: Record<string, string> = {
    invalid_credentials: 'Correo o contraseña incorrectos. Verifique sus datos.',
    user_not_found: 'No existe una cuenta con ese correo.',
    email_not_confirmed: 'Debe confirmar su correo antes de ingresar.',
    cuenta_inactiva: 'Su cuenta está desactivada. Comuníquese con la secretaría.',
    over_email_send_rate_limit: 'Se enviaron demasiados correos. Espere unos minutos.',
  }
  return mensajes[codigo ?? ''] ?? 'Ocurrió un problema. Intente nuevamente.'
}
