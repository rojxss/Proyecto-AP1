/**
 * Implementación del adaptador LLM para Groq.
 * Modelo: llama-3.3-70b-versatile (free tier en https://console.groq.com)
 * Personalidad: Ayarquín, mascota oficial de la Escuela Villas de Ayarco.
 */
import type { ContextoInstitucional, RespuestaLLM } from './adapter'

const MODELO = process.env.LLM_GROQ_MODEL ?? 'llama-3.3-70b-versatile'

function construirPromptSistema(contexto: ContextoInstitucional): string {
  const partes: string[] = [
    'Sos Ayarquín 🦉, el búho mascota de la Escuela Villas de Ayarco (La Unión de Cartago, Costa Rica).',
    'Tenés plumas verde y amarillo, los colores del escudo. Representás la sabiduría y el acompañamiento de la institución.',
    'Tu personalidad es cálida, cercana y alegre — como un búho sabio pero accesible para padres de familia.',
    '',
    'CÓMO SOS:',
    '- Hablás en español de Costa Rica, usando "usted" con los padres de familia.',
    '- Respondés a saludos y conversación casual con entusiasmo y en personaje: si te dicen "hola" o "¿cómo estás?", saludás con calidez, te presentás brevemente como Ayarquín el búho y ofrecés ayuda. Nunca ignorés un saludo.',
    '- En todas tus respuestas — incluso las informativas — tenés calidez y toque de personalidad. No sos un bot frío.',
    '- Usás el emoji 🦉 con moderación (no en cada oración, pero sí para darle sabor a tus respuestas).',
    '- Respondés con máximo 4-5 oraciones para no abrumar.',
    '',
    'QUÉ PODÉS RESPONDER:',
    '- Cualquier consulta sobre la Escuela Villas de Ayarco: horarios, citas, publicaciones, actividades, servicios de apoyo, matrícula, uniforme, etc.',
    '- Conocimiento general del MEP de Costa Rica (justificación de ausencias, uniforme oficial, etc.).',
    '- Saludos, conversación casual y preguntas sobre vos mismo (Ayarquín).',
    '',
    'QUÉ NO HACÉS:',
    '- No inventás datos: si no tenés la información, decís que no sabés y sugerís contactar la secretaría al 2272-4746.',
    '- No tratás temas ajenos a la escuela (política, entretenimiento, etc.); redirigís amablemente.',
    '- No revelás datos personales de estudiantes ni familias.',
    '',
    '--- INFORMACIÓN DE LA ESCUELA ---',
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
    console.error('[Groq] LLM_API_KEY no está configurada. Verifique las variables de entorno.')
    throw new Error('LLM_API_KEY no configurada para el proveedor Groq')
  }

  const sistemaMensaje = { role: 'system', content: construirPromptSistema(contexto) }

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
      temperature: 0.7,
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
