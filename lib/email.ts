/**
 * Servicio de notificaciones por correo usando Gmail SMTP (Nodemailer).
 * Credenciales en variables de entorno; nunca hardcodeadas.
 * Si GMAIL_USER no está configurado, solo registra en consola (modo dev).
 */
import nodemailer from 'nodemailer'

const NOMBRE_ESCUELA = 'Escuela Villas de Ayarco'
const GMAIL_USER     = process.env.GMAIL_USER
const GMAIL_PASS     = process.env.GMAIL_APP_PASSWORD

const transporter = GMAIL_USER && GMAIL_PASS
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    })
  : null

async function enviar(para: string | string[], asunto: string, texto: string) {
  if (!transporter) {
    console.log(`[Email] ${asunto} → ${Array.isArray(para) ? para.join(', ') : para}`)
    return
  }
  await transporter.sendMail({
    from: `${NOMBRE_ESCUELA} <${GMAIL_USER}>`,
    to: Array.isArray(para) ? para.join(', ') : para,
    subject: asunto,
    text: texto,
  })
}

// ── Plantillas ────────────────────────────────────────────────────────────────

function plantillaNuevaCita(p: {
  nombrePadre: string
  nombreFuncionario: string
  fecha: string
  bloque: string
  motivo: string
}) {
  return `Se ha solicitado una cita con los siguientes datos:

  Padre / Madre : ${p.nombrePadre}
  Funcionario   : ${p.nombreFuncionario}
  Fecha         : ${p.fecha}
  Bloque        : ${p.bloque}
  Motivo        : ${p.motivo}

Estado actual: Pendiente de confirmación.
Si usted es el funcionario/a, ingrese a la plataforma para confirmar o rechazar la solicitud.

— ${NOMBRE_ESCUELA}`
}

function plantillaEstadoCambiado(p: {
  nombrePadre: string
  nombreFuncionario: string
  fecha: string
  bloque: string
  nuevoEstado: string
  motivoRechazo?: string | null
}) {
  let texto = `Su cita ha cambiado de estado.

  Padre / Madre : ${p.nombrePadre}
  Funcionario   : ${p.nombreFuncionario}
  Fecha         : ${p.fecha}
  Bloque        : ${p.bloque}
  Nuevo estado  : ${p.nuevoEstado}`

  if (p.motivoRechazo) texto += `\n  Motivo de rechazo: ${p.motivoRechazo}`
  texto += `\n\n— ${NOMBRE_ESCUELA}`
  return texto
}

// ── Funciones exportadas ──────────────────────────────────────────────────────

/**
 * Notifica la creación de una nueva cita a ambas partes.
 */
export async function notificarNuevaCita(p: {
  emailPadre: string
  emailFuncionario: string
  nombrePadre: string
  nombreFuncionario: string
  fecha: string
  bloque: string
  motivo: string
}) {
  const texto  = plantillaNuevaCita(p)
  const asunto = `Nueva solicitud de cita — ${p.fecha}`

  await Promise.allSettled([
    enviar(p.emailPadre,      asunto, `Estimado/a ${p.nombrePadre},\n\n${texto}`),
    enviar(p.emailFuncionario, asunto, `Estimado/a ${p.nombreFuncionario},\n\n${texto}`),
  ])
}

/**
 * Notifica el cambio de estado de una cita.
 */
export async function notificarCambioCita(p: {
  emailPadre: string
  emailFuncionario?: string
  nombrePadre: string
  nombreFuncionario: string
  fecha: string
  bloque: string
  nuevoEstado: string
  motivoRechazo?: string | null
}) {
  const texto  = plantillaEstadoCambiado(p)
  const asunto = `Cita ${p.nuevoEstado.toLowerCase()} — ${p.fecha}`

  const destinatarios = [p.emailPadre]
  if (p.emailFuncionario) destinatarios.push(p.emailFuncionario)

  await Promise.allSettled(
    destinatarios.map(to => enviar(to, asunto, `Estimado/a:\n\n${texto}`))
  )
}

/**
 * Notifica al nuevo usuario sus credenciales de acceso provisionales.
 */
export async function notificarBienvenida(p: {
  email: string
  nombre: string
  passwordProvisional: string
}) {
  const url    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://escuela-villas-de-ayarco.vercel.app'
  const asunto = `Bienvenido/a a la Plataforma Escolar — ${NOMBRE_ESCUELA}`
  const texto  = `Su cuenta en la Plataforma Escolar ha sido creada.

Sus datos de acceso son:

  Correo     : ${p.email}
  Contraseña : ${p.passwordProvisional}

Ingrese en: ${url}

Por seguridad, cambie su contraseña al iniciar sesión por primera vez.
Use la opción «¿Olvidó su contraseña?» para establecer una nueva clave.

— ${NOMBRE_ESCUELA}`

  await enviar(p.email, asunto, `Estimado/a ${p.nombre},\n\n${texto}`)
}
