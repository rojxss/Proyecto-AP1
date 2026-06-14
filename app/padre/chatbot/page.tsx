/**
 * ChatbotPadrePage — /padre/chatbot
 * Asistente virtual que responde consultas usando información de la plataforma.
 * RF-16: chatbot con IA usando ÚNICAMENTE datos institucionales (sin PII al LLM).
 */
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { consultarLLM, type ContextoInstitucional } from '@/lib/llm/adapter'
import AvatarAyarquin from '@/components/chatbot/AvatarAyarquin'

// ── Server Action ─────────────────────────────────────────────────────────────

async function enviarMensaje(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const consulta = (formData.get('consulta') as string)?.trim()
  if (!consulta || consulta.length > 500) return

  // Historial reciente para dar contexto a preguntas de seguimiento (últimos 3 intercambios)
  const { data: historialRaw } = await supabase
    .from('chatbot_logs')
    .select('consulta, respuesta')
    .eq('padre_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const historial = ((historialRaw ?? []).reverse()).flatMap(h => [
    { rol: 'padre' as const,      texto: h.consulta as string },
    { rol: 'asistente' as const,  texto: h.respuesta as string },
  ])

  // ── 1. Construir contexto institucional (sin PII) ──────────────────────────

  // Info institucional general
  const { data: infosRaw } = await supabase
    .from('institution_info')
    .select('clave, valor, tipo, orden')
    .order('orden')

  const infos = infosRaw ?? []
  const textos   = infos.filter(i => i.tipo === 'texto')
  const faqs     = infos.filter(i => i.tipo === 'faq')
  const avisos   = infos.filter(i => i.tipo === 'aviso').sort((a, b) => b.orden - a.orden).slice(0, 5)
  const servicios = infos.filter(i => i.tipo === 'servicio')

  const getInfo = (clave: string) => textos.find(t => t.clave === clave)?.valor ?? ''

  const serviciosTexto = servicios.map(s => s.valor).join(', ')

  const avisosTexto = avisos.map(a => {
    const [fecha, titulo, texto] = a.valor.split('|||')
    return `[${fecha ?? ''}] ${titulo ?? ''}: ${texto ?? ''}`
  }).filter(a => a.length > 6).join('\n')

  const infoInstitucional = [
    `Escuela: ${getInfo('nombre')}`,
    `Ubicación: ${getInfo('direccion')}`,
    `Teléfono: ${getInfo('telefono')}`,
    `Correo: ${getInfo('correo')}`,
    `Horario de atención: ${getInfo('horario_atencion')}`,
    `Directora: ${getInfo('directora')}`,
    `Secretaria: ${getInfo('secretaria')}`,
    serviciosTexto ? `Servicios de apoyo disponibles: ${serviciosTexto}` : '',
    avisosTexto ? `\nAvisos recientes en el tablón:\n${avisosTexto}` : '',
  ].filter(Boolean).join('\n')

  // Fix: las FAQs se guardan en JSON desde el CRUD; intentar parsear antes de split
  const faqFormateadas = faqs.map(f => {
    let pregunta = '', respuesta = ''
    try {
      const p = JSON.parse(f.valor)
      pregunta = p.pregunta ?? ''; respuesta = p.respuesta ?? ''
    } catch {
      const partes = f.valor.split('|||')
      pregunta = partes[0] ?? ''; respuesta = partes[1] ?? ''
    }
    return { pregunta, respuesta }
  }).filter(f => f.pregunta && f.respuesta)

  // Grupos de los hijos del padre (solo grupos, sin nombres de estudiantes)
  const { data: vinculosRaw } = await supabase
    .from('parent_student')
    .select('estudiante_id')
    .eq('padre_id', user.id)

  const estudianteIds = (vinculosRaw ?? []).map(v => v.estudiante_id as string)
  let grupos: string[] = []

  if (estudianteIds.length > 0) {
    const { data: estudiantesRaw } = await supabase
      .from('students')
      .select('grupo')
      .in('id', estudianteIds)
      .eq('activo', true)
    grupos = [...new Set((estudiantesRaw ?? []).map(e => e.grupo as string))]
  }

  // Publicaciones recientes de esos grupos (sin datos personales)
  let publicacionesCtx: ContextoInstitucional['publicaciones'] = []
  if (grupos.length > 0) {
    const { data: postsRaw } = await supabase
      .from('posts')
      .select('tipo, titulo, contenido, created_at, segmento, segmento_valor')
      .or(`segmento.eq.todos,segmento_valor.in.(${grupos.map(g => `"${g}"`).join(',')})`)
      .order('created_at', { ascending: false })
      .limit(8)

    publicacionesCtx = (postsRaw ?? []).map(p => ({
      tipo: p.tipo as string,
      titulo: p.titulo as string,
      contenido: (p.contenido as string) ?? '',
      fecha: new Date(p.created_at as string).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }),
    }))
  }

  // Horario de los grupos (sin nombres de estudiantes)
  let horarioGrupo = ''
  if (grupos.length > 0) {
    const { data: entradasRaw } = await supabase
      .from('schedule_entries')
      .select(`dia, materia, aula, bloque:time_blocks(etiqueta), grupo`)
      .in('grupo', grupos)
      .order('grupo')

    if (entradasRaw && entradasRaw.length > 0) {
      const porGrupo: Record<string, string[]> = {}
      for (const e of entradasRaw) {
        const etiqueta = (e.bloque as { etiqueta?: string } | null)?.etiqueta ?? ''
        if (!porGrupo[e.grupo as string]) porGrupo[e.grupo as string] = []
        porGrupo[e.grupo as string].push(`${e.dia} ${etiqueta}: ${e.materia}${e.aula ? ` (Aula ${e.aula})` : ''}`)
      }
      horarioGrupo = Object.entries(porGrupo)
        .map(([g, entries]) => `Grupo ${g}:\n${entries.join('\n')}`)
        .join('\n\n')
    }
  }

  // Citas activas del padre (para responder "¿tengo alguna cita pendiente?")
  const { data: citasRaw } = await supabase
    .from('appointments')
    .select(`fecha, estado, motivo, bloque:time_blocks(etiqueta), funcionario:profiles!funcionario_id(nombre_completo)`)
    .eq('padre_id', user.id)
    .in('estado', ['Pendiente', 'Confirmada'])
    .order('fecha', { ascending: true })
    .limit(5)

  const citasActivasTexto = (citasRaw ?? []).map(c => {
    const bloque = (c.bloque as { etiqueta?: string } | null)?.etiqueta ?? ''
    const funcionario = (c.funcionario as { nombre_completo?: string } | null)?.nombre_completo ?? 'docente'
    return `${c.fecha} ${bloque} con ${funcionario} — ${c.estado} (motivo: ${c.motivo})`
  }).join('\n')

  const infoInstitucionalFinal = citasActivasTexto
    ? `${infoInstitucional}\n\nCITAS ACTIVAS DEL PADRE:\n${citasActivasTexto}`
    : infoInstitucional

  const contexto: ContextoInstitucional = {
    infoInstitucional: infoInstitucionalFinal,
    faq: faqFormateadas,
    publicaciones: publicacionesCtx,
    horarioGrupo: horarioGrupo || undefined,
    historial: historial.length > 0 ? historial : undefined,
  }

  // ── 2. Llamar al LLM ──────────────────────────────────────────────────────

  let respuestaTexto = ''
  let proveedor = 'mock'

  try {
    const resultado = await consultarLLM(consulta, contexto)
    respuestaTexto = resultado.texto
    proveedor = resultado.proveedor
  } catch {
    respuestaTexto = 'No pude procesar su consulta en este momento. Por favor comuníquese con la secretaría al 2272-4746.'
    proveedor = 'error'
  }

  // ── 3. Guardar en chatbot_logs ────────────────────────────────────────────

  await supabase.from('chatbot_logs').insert({
    padre_id: user.id,
    consulta,
    respuesta: respuestaTexto,
    proveedor,
  })

  revalidatePath('/padre/chatbot')
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface LogRow {
  id: string
  consulta: string
  respuesta: string
  created_at: string
}

// ── Página ────────────────────────────────────────────────────────────────────

export default async function ChatbotPadrePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Historial de conversaciones del padre (últimas 20)
  const { data: logsRaw } = await supabase
    .from('chatbot_logs')
    .select('id, consulta, respuesta, created_at')
    .eq('padre_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const logs = ((logsRaw ?? []) as LogRow[]).reverse()

  return (
    <div style={{ maxWidth: '720px' }}>

      {/* Encabezado de Ayarquín */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
        <AvatarAyarquin size={72} />
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.1rem' }}>Ayarquín 🦉</h1>
          <p style={{ color: 'var(--tinta-suave)', fontSize: '0.85rem', margin: 0 }}>
            Asistente virtual · Escuela Villas de Ayarco
          </p>
        </div>
      </div>

      {/* Historial de conversación */}
      <div style={{
        background: 'var(--crema)',
        border: '1px solid var(--linea)',
        borderRadius: 'var(--radio)',
        padding: '1rem',
        marginBottom: '1rem',
        minHeight: '200px',
        maxHeight: '480px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {logs.length === 0 ? (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <AvatarAyarquin size={36} />
            <div style={{
              background: '#fff', border: '1px solid var(--linea)',
              borderRadius: '4px 16px 16px 16px',
              padding: '0.75rem 1rem', fontSize: '0.9rem', lineHeight: 1.55,
              color: 'var(--tinta)',
            }}>
              ¡Hola! Soy <strong>Ayarquín</strong> 🦉, el asistente virtual de la Escuela Villas de Ayarco.
              Estoy aquí para ayudarle a encontrar información sobre horarios, comunicados,
              actividades y otros servicios de nuestra comunidad educativa. ¿En qué puedo colaborar hoy?
            </div>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id}>
              {/* Mensaje del padre */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
                <div style={{
                  background: 'var(--verde-700)', color: '#fff',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '0.6rem 1rem', maxWidth: '78%', fontSize: '0.9rem',
                }}>
                  {log.consulta}
                </div>
              </div>
              {/* Respuesta de Ayarquín */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem' }}>
                <AvatarAyarquin size={36} />
                <div style={{
                  background: '#fff', border: '1px solid var(--linea)',
                  borderRadius: '4px 16px 16px 16px',
                  padding: '0.6rem 1rem', maxWidth: '78%',
                  fontSize: '0.9rem', lineHeight: 1.55,
                }}>
                  {log.respuesta}
                  <div style={{ fontSize: '0.68rem', color: 'var(--tinta-suave)', marginTop: '0.3rem' }}>
                    Ayarquín · {new Date(log.created_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulario de envío */}
      <form action={enviarMensaje} style={{ display: 'flex', gap: '0.6rem' }}>
        <input
          name="consulta"
          type="text"
          maxLength={500}
          required
          placeholder="Escriba su mensaje para Ayarquín…"
          style={{
            flex: 1, padding: '0.7rem 1rem',
            borderRadius: '10px', border: '1.5px solid var(--linea)',
            fontSize: '0.9rem', outline: 'none',
          }}
          autoComplete="off"
        />
        <button type="submit" className="btn" style={{ whiteSpace: 'nowrap' }}>
          Enviar
        </button>
      </form>

      <p style={{ fontSize: '0.75rem', color: 'var(--tinta-suave)', marginTop: '0.6rem' }}>
        Para consultas que requieran atención personalizada, contacte a la secretaría al <strong>2272-4746</strong>.
      </p>
    </div>
  )
}
