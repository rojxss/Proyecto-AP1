/**
 * Módulo de notificaciones por correo con Resend.
 * Solo se usa para notificaciones de citas; los correos de auth los maneja Supabase.
 * Plan free de Resend: 100 correos/día, 3000/mes.
 */
import { Resend } from 'resend'
import type { EstadoCita } from '@/types/database'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'plataforma@escuelasvillasdeayarco.ed.cr'
const ESCUELA = 'Escuela Villas de Ayarco'

interface DatosCita {
  padreNombre: string
  padreCorreo: string
  funcionarioNombre: string
  funcionarioCorreo: string
  fecha: string
  bloque: string
  motivo: string
  motivoRechazo?: string
  estado: EstadoCita
}

function asunto(estado: EstadoCita): string {
  const asuntos: Record<EstadoCita, string> = {
    Pendiente: 'Nueva solicitud de cita recibida',
    Confirmada: 'Su cita ha sido confirmada',
    Rechazada: 'Su cita no pudo ser confirmada',
    Cancelada: 'Cita cancelada',
    Completada: 'Cita completada',
  }
  return `${ESCUELA} — ${asuntos[estado]}`
}

function cuerpoHtml(datos: DatosCita, destinatario: 'padre' | 'funcionario'): string {
  const esPadre = destinatario === 'padre'
  const intro = esPadre
    ? `Estimado(a) ${datos.padreNombre}:`
    : `Estimado(a) ${datos.funcionarioNombre}:`

  const detalles = `
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:6px 12px;background:#E4F0E8;font-weight:bold">Funcionario</td><td style="padding:6px 12px;border:1px solid #D8E2DA">${datos.funcionarioNombre}</td></tr>
      <tr><td style="padding:6px 12px;background:#E4F0E8;font-weight:bold">Fecha</td><td style="padding:6px 12px;border:1px solid #D8E2DA">${datos.fecha}</td></tr>
      <tr><td style="padding:6px 12px;background:#E4F0E8;font-weight:bold">Bloque horario</td><td style="padding:6px 12px;border:1px solid #D8E2DA">${datos.bloque}</td></tr>
      <tr><td style="padding:6px 12px;background:#E4F0E8;font-weight:bold">Motivo</td><td style="padding:6px 12px;border:1px solid #D8E2DA">${datos.motivo}</td></tr>
      <tr><td style="padding:6px 12px;background:#E4F0E8;font-weight:bold">Estado</td><td style="padding:6px 12px;border:1px solid #D8E2DA"><strong>${datos.estado}</strong></td></tr>
      ${datos.motivoRechazo ? `<tr><td style="padding:6px 12px;background:#F8E2DE;font-weight:bold">Motivo del rechazo</td><td style="padding:6px 12px;border:1px solid #D8E2DA">${datos.motivoRechazo}</td></tr>` : ''}
    </table>
  `

  const footer = `
    <hr style="border:none;border-top:1px solid #D8E2DA;margin:24px 0">
    <p style="font-size:12px;color:#5A6B5F">${ESCUELA} · 2272-4746 · esc.villasdeayarco@mep.go.cr</p>
    <p style="font-size:11px;color:#8A958D">Este correo fue generado automáticamente por la plataforma de gestión escolar.</p>
  `

  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1F2922">
      <div style="background:#1E6B3C;padding:16px 24px;border-radius:8px 8px 0 0">
        <span style="color:#fff;font-size:18px;font-weight:bold">${ESCUELA}</span>
      </div>
      <div style="padding:24px;background:#fff;border:1px solid #D8E2DA;border-top:none;border-radius:0 0 8px 8px">
        <p style="margin-bottom:8px">${intro}</p>
        <p>Le informamos que la cita tiene el siguiente estado: <strong>${datos.estado}</strong>.</p>
        ${detalles}
        ${footer}
      </div>
    </div>
  `
}

/**
 * Envía notificación de cita a ambas partes (padre y funcionario).
 * Silencia errores para no bloquear operaciones críticas de la BD.
 */
export async function notificarCita(datos: DatosCita): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada, notificación omitida')
    return
  }

  const envios = [
    resend.emails.send({
      from: FROM,
      to: datos.padreCorreo,
      subject: asunto(datos.estado),
      html: cuerpoHtml(datos, 'padre'),
    }),
    resend.emails.send({
      from: FROM,
      to: datos.funcionarioCorreo,
      subject: asunto(datos.estado),
      html: cuerpoHtml(datos, 'funcionario'),
    }),
  ]

  const resultados = await Promise.allSettled(envios)
  resultados.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[email] Error enviando correo ${i === 0 ? 'padre' : 'funcionario'}:`, r.reason)
    }
  })
}
