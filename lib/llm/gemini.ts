/**
 * Implementación del adaptador LLM para Google Gemini.
 * Modelo: gemini-2.0-flash (free tier: 1500 req/día en Google AI Studio).
 *
 * IMPORTANTE: usar Google AI Studio SIN activar facturación para mantener el free tier.
 * Documentación: https://ai.google.dev/gemini-api/docs
 */
import type { ContextoInstitucional, RespuestaLLM } from './adapter'

const MODELO = process.env.LLM_GEMINI_MODEL ?? 'gemini-2.0-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`

function construirPromptSistema(contexto: ContextoInstitucional): string {
  const partes: string[] = [
    'Eres el asistente virtual de la Escuela Villas de Ayarco (Costa Rica). Tu única función es responder consultas de padres de familia sobre información escolar usando los datos que se te proporcionan.',
    'REGLAS ESTRICTAS:',
    '- Responde ÚNICAMENTE con información contenida en el contexto proporcionado.',
    '- Si la consulta excede tu alcance, indícalo claramente y sugiere contactar a la secretaría.',
    '- No inventes datos, horarios ni información que no esté en el contexto.',
    '- Responde siempre en español de Costa Rica, con tono cordial y claro.',
    '- Sé breve: máximo 3 oraciones por respuesta.',
    '- NUNCA menciones nombres de estudiantes específicos, correos ni datos personales.',
    '',
    'INFORMACIÓN INSTITUCIONAL DISPONIBLE:',
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

export async function consultarGemini(
  consulta: string,
  contexto: ContextoInstitucional
): Promise<RespuestaLLM> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    throw new Error('LLM_API_KEY no configurada para el proveedor Gemini')
  }

  const promptSistema = construirPromptSistema(contexto)

  const respuesta = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: promptSistema }] },
      contents: [{ role: 'user', parts: [{ text: consulta }] }],
      generationConfig: {
        maxOutputTokens: 256,
        temperature: 0.2,   // respuestas más consistentes y precisas
      },
    }),
  })

  if (!respuesta.ok) {
    const error = await respuesta.text()
    console.error('[Gemini] Error de API:', error)
    throw new Error('Error al consultar el asistente virtual')
  }

  const datos = await respuesta.json()
  const texto = datos.candidates?.[0]?.content?.parts?.[0]?.text ??
    'No pude procesar su consulta. Intente nuevamente o contacte a la secretaría.'

  return { texto, proveedor: 'gemini' }
}
