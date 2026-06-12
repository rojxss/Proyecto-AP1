/**
 * Implementación del adaptador LLM para Groq (proveedor alternativo).
 * Modelo: llama-3.1-8b-instant (free tier muy generoso en https://console.groq.com)
 * Misma política de privacidad que el adaptador de Gemini: sin PII al LLM.
 */
import type { ContextoInstitucional, RespuestaLLM } from './adapter'

const MODELO = process.env.LLM_GROQ_MODEL ?? 'llama-3.1-8b-instant'

function construirMensajes(consulta: string, contexto: ContextoInstitucional) {
  const partesSistema: string[] = [
    'Eres el asistente virtual de la Escuela Villas de Ayarco (Costa Rica). Responde consultas de padres de familia usando únicamente la información proporcionada.',
    'Responde siempre en español de Costa Rica. Sé breve (máx. 3 oraciones). Si la consulta está fuera de tu alcance, indica cómo contactar a la secretaría.',
    'NUNCA menciones nombres de estudiantes específicos, correos ni datos personales.',
    '',
    'CONTEXTO DISPONIBLE:',
  ]

  if (contexto.infoInstitucional) partesSistema.push(contexto.infoInstitucional)
  if (contexto.horarioGrupo) partesSistema.push(`\nHORARIO:\n${contexto.horarioGrupo}`)
  if (contexto.faq?.length) {
    partesSistema.push('\nFAQ:')
    contexto.faq.forEach(f => partesSistema.push(`P: ${f.pregunta}\nR: ${f.respuesta}`))
  }
  if (contexto.publicaciones?.length) {
    partesSistema.push('\nPUBLICACIONES:')
    contexto.publicaciones.forEach(p =>
      partesSistema.push(`[${p.tipo}] ${p.titulo} (${p.fecha}): ${p.contenido}`)
    )
  }

  return [
    { role: 'system', content: partesSistema.join('\n') },
    { role: 'user', content: consulta },
  ]
}

export async function consultarGroq(
  consulta: string,
  contexto: ContextoInstitucional
): Promise<RespuestaLLM> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    throw new Error('LLM_API_KEY no configurada para el proveedor Groq')
  }

  const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODELO,
      messages: construirMensajes(consulta, contexto),
      max_tokens: 256,
      temperature: 0.2,
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
