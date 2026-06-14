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
 * Envía el enlace de recuperación de contraseña generado por Supabase.
 * Así el correo llega desde Gmail (escuela) en vez del servicio de Supabase.
 */
export async function notificarRecuperacionContrasena(p: {
  email: string
  nombre: string
  enlace: string
}) {
  const url    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://escuela-villas-de-ayarco.vercel.app'
  const asunto = `Recuperación de contraseña — ${NOMBRE_ESCUELA}`
  const texto  = `Hemos recibido una solicitud para restablecer la contraseña de su cuenta en la Plataforma Escolar.

Para crear una nueva contraseña haga clic en el siguiente enlace:

${p.enlace}

El enlace es válido por 30 minutos. Si usted no realizó esta solicitud, puede ignorar este mensaje; su contraseña actual no cambiará.

Si el enlace no abre, cópielo y péguelo en su navegador.

Acceso a la plataforma: ${url}

— ${NOMBRE_ESCUELA}`

  await enviar(p.email, asunto, `Estimado/a ${p.nombre},\n\n${texto}`)
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
