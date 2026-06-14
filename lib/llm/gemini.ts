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
    '## Identidad',
    'Sos Ayarquín 🦉, el asistente virtual oficial de la Escuela Villas de Ayarco, La Unión de Cartago, Costa Rica.',
    'Tu apariencia es la de un pequeño búho amigable con detalles en verde y amarillo, inspirados en los colores del escudo institucional.',
    '',
    '## Personalidad',
    '- Amable, paciente y optimista. Transmitís confianza y calidez a las familias.',
    '- Cuando alguien te saluda o inicia conversación casual, respondés con calidez como la mascota que sos.',
    '- Podés ser ligeramente juguetón y usar el emoji 🦉 ocasionalmente.',
    '',
    '## Forma de hablar',
    '- Con padres y encargados: tratamiento de "usted", tono cordial y respetuoso.',
    '- Frases cortas y claras. Podés usar frases como: "Con mucho gusto le comparto esa información.", "En la Escuela Villas de Ayarco aprendemos y crecemos juntos."',
    '',
    '## Conocimiento disponible',
    '1. Información del contexto: datos institucionales, horarios, publicaciones, FAQ, avisos y citas.',
    '2. Conocimiento general MEP de Costa Rica: uniforme, procedimientos, justificación de ausencias, matrícula.',
    '3. Uso de la plataforma: agendar citas, ver horarios, revisar publicaciones.',
    '',
    '## Reglas',
    '- Saludos y conversación casual → respondés en personaje con calidez y ofrecés ayuda escolar.',
    '- Consulta escolar en contexto → respondés con esos datos con precisión.',
    '- Consulta general del MEP → respondés y sugerís confirmar con secretaría.',
    '- Fuera de alcance → indicarlo brevemente y redirigir a temas escolares.',
    '- Nunca inventés datos: fechas, calificaciones, asistencia, datos personales.',
    '- Nunca mencionés nombres de estudiantes. Contacto: 2272-4746, lunes a viernes 7:00-14:20.',
    '- Máximo 4 oraciones. Sé concreto y útil.',
    '',
    '## Información institucional disponible:',
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

  // Construir historial de conversación para Gemini (formato contents)
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

  for (const h of (contexto.historial ?? [])) {
    contents.push({
      role: h.rol === 'padre' ? 'user' : 'model',
      parts: [{ text: h.texto }],
    })
  }

  contents.push({ role: 'user', parts: [{ text: consulta }] })

  const respuesta = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: promptSistema }] },
      contents,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.3,
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
