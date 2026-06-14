/**
 * Implementación del adaptador LLM para Groq (proveedor alternativo).
 * Modelo: llama-3.1-8b-instant (free tier muy generoso en https://console.groq.com)
 * Misma política de privacidad que el adaptador de Gemini: sin PII al LLM.
 */
import type { ContextoInstitucional, RespuestaLLM } from './adapter'

const MODELO = process.env.LLM_GROQ_MODEL ?? 'llama-3.1-8b-instant'

function construirPromptSistema(contexto: ContextoInstitucional): string {
  const partes: string[] = [
    'Sos el asistente virtual de la Escuela Villas de Ayarco, ubicada en La Unión de Cartago, Costa Rica. Ayudás a padres de familia con consultas sobre la escuela y la plataforma.',
    '',
    'FUENTES DE CONOCIMIENTO (en orden de prioridad):',
    '1. Información del contexto proporcionado: horarios, publicaciones, FAQ, datos institucionales y citas.',
    '2. Conocimiento general sobre escuelas públicas del MEP de Costa Rica: uniforme, procedimientos comunes, justificación de ausencias, matrícula, calendario escolar.',
    '3. Cómo usar las funciones de esta plataforma: agendar citas, ver horarios, revisar publicaciones.',
    '',
    'REGLAS:',
    '- Respondé siempre en español de Costa Rica, con tono cordial, claro y directo.',
    '- Si la respuesta está en el contexto, usala con precisión.',
    '- Para preguntas sobre procedimientos generales del MEP, podés responder con tu conocimiento y aclarar que lo confirmen con la secretaría si necesitan el dato exacto de esta escuela.',
    '- Nunca inventés datos específicos como fechas exactas, calificaciones, asistencia ni información personal.',
    '- Nunca mencionés nombres de estudiantes ni datos personales de las familias.',
    '- Si algo está completamente fuera de tu alcance, decilo brevemente y dá el teléfono 2272-4746.',
    '- Máximo 4 oraciones por respuesta. Sé concreto y útil, no repetitivo.',
    '- Si el padre hace una pregunta de seguimiento, usá el historial de conversación para responder con coherencia.',
    '',
    'INFORMACIÓN INSTITUCIONAL:',
  ]

  if (contexto.infoInstitucional) {
    partes.push(contexto.infoInstitucional)
  }

  if (contexto.horarioGrupo) {
    partes.push('\nHORARIO DEL GRUPO:')
    partes.push(contexto.horarioGrupo)
  }

  if (contexto.faq && contexto.faq.length > 0) {
    partes.push('\nPREGUNTAS FRECUENTES:')
    contexto.faq.forEach(({ pregunta, respuesta }) => {
      partes.push(`P: ${pregunta}\nR: ${respuesta}`)
    })
  }

  if (contexto.publicaciones && contexto.publicaciones.length > 0) {
    partes.push('\nPUBLICACIONES RECIENTES:')
    contexto.publicaciones.forEach(({ tipo, titulo, contenido, fecha }) => {
      partes.push(`[${tipo.toUpperCase()}] ${titulo} (${fecha}): ${contenido}`)
    })
  }

  return partes.join('\n')
}

export async function consultarGroq(
  consulta: string,
  contexto: ContextoInstitucional
): Promise<RespuestaLLM> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    throw new Error('LLM_API_KEY no configurada para el proveedor Groq')
  }

  const sistemaMensaje = { role: 'system', content: construirPromptSistema(contexto) }

  // Incluir historial de conversación para preguntas de seguimiento
  const mensajesHistorial = (contexto.historial ?? []).map(h => ({
    role: h.rol === 'padre' ? 'user' : 'assistant',
    content: h.texto,
  }))

  const mensajes = [
    sistemaMensaje,
    ...mensajesHistorial,
    { role: 'user', content: consulta },
  ]

  const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODELO,
      messages: mensajes,
      max_tokens: 400,
      temperature: 0.3,
    }),
  })

  if (!respuesta.ok) {
    const error = await respuesta.text()
    console.error('[Groq] Error de API:', error)
    throw new Error('Error al consultar el asistente virtual')
  }

  const datos = await respuesta.json()
  const texto = datos.choices?.[0]?.message?.content ??
    'No pude procesar su consulta. Intente nuevamente o contacte a la secretaría.'

  return { texto, proveedor: 'groq' }
}
