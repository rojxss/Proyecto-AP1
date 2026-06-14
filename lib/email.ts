/**
 * Servicio de notificaciones por correo para citas.
 * Usa Resend. Si RESEND_API_KEY no está configurado, solo registra en consola.
 * RF-08: notificar al crear, confirmar, rechazar y cancelar citas.
 */
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Plataforma Escolar <onboarding@resend.dev>'
const NOMBRE_ESCUELA = 'Escuela Villas de Ayarco'

// ── Plantillas de texto plano ─────────────────────────────────────────────────

function plantillaNuevaCita(params: {
  nombrePadre: string
  nombreFuncionario: string
  fecha: string
  bloque: string
  motivo: string
}) {
  return `
Se ha solicitado una cita con los siguientes datos:

  Padre / Madre : ${params.nombrePadre}
  Funcionario   : ${params.nombreFuncionario}
  Fecha         : ${params.fecha}
  Bloque        : ${params.bloque}
  Motivo        : ${params.motivo}

Estado actual: Pendiente de confirmación.

Si usted es el funcionario/a, ingrese a la plataforma para confirmar o rechazar la solicitud.

— ${NOMBRE_ESCUELA}
`.trim()
}

function plantillaEstadoCambiado(params: {
  nombrePadre: string
  nombreFuncionario: string
  fecha: string
  bloque: string
  nuevoEstado: string
  motivoRechazo?: string | null
}) {
  let cuerpo = `
Su cita ha cambiado de estado.

  Padre / Madre : ${params.nombrePadre}
  Funcionario   : ${params.nombreFuncionario}
  Fecha         : ${params.fecha}
  Bloque        : ${params.bloque}
  Nuevo estado  : ${params.nuevoEstado}
`.trim()

  if (params.motivoRechazo) {
    cuerpo += `\n  Motivo de rechazo: ${params.motivoRechazo}`
  }

  cuerpo += `\n\n— ${NOMBRE_ESCUELA}`
  return cuerpo
}

// ── Funciones exportadas ──────────────────────────────────────────────────────

/**
 * Notifica la creación de una nueva cita a ambas partes.
 */
export async function notificarNuevaCita(params: {
  emailPadre: string
  emailFuncionario: string
  nombrePadre: string
  nombreFuncionario: string
  fecha: string
  bloque: string
  motivo: string
}) {
  const cuerpo = plantillaNuevaCita(params)
  const asunto = `Nueva solicitud de cita — ${params.fecha}`

  if (!resend) {
    console.log('[Email] Nueva cita →', params.emailPadre, params.emailFuncionario, asunto)
    return
  }

  await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: params.emailPadre,
      subject: asunto,
      text: `Estimado/a ${params.nombrePadre},\n\n${cuerpo}`,
    }),
    resend.emails.send({
      from: FROM,
      to: params.emailFuncionario,
      subject: asunto,
      text: `Estimado/a ${params.nombreFuncionario},\n\n${cuerpo}`,
    }),
  ])
}

/**
 * Notifica el cambio de estado de una cita. Siempre notifica al padre.
 * Si el estado es Cancelada (por el padre), también notifica al funcionario.
 */
export async function notificarCambioCita(params: {
  emailPadre: string
  emailFuncionario?: string
  nombrePadre: string
  nombreFuncionario: string
  fecha: string
  bloque: string
  nuevoEstado: string
  motivoRechazo?: string | null
}) {
  const cuerpo = plantillaEstadoCambiado(params)
  const asunto = `Cita ${params.nuevoEstado.toLowerCase()} — ${params.fecha}`

  if (!resend) {
    console.log('[Email] Cambio cita →', params.emailPadre, asunto)
    return
  }

  const destinatarios = [params.emailPadre]
  if (params.emailFuncionario) destinatarios.push(params.emailFuncionario)

  await Promise.allSettled(
    destinatarios.map(to =>
      resend.emails.send({
        from: FROM,
        to,
        subject: asunto,
        text: `Estimado/a:\n\n${cuerpo}`,
      })
    )
  )
}
