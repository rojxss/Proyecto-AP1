/**
 * Implementación del adaptador LLM para Groq.
 * Modelo: llama-3.1-8b-instant (free tier en https://console.groq.com)
 * Personalidad: Ayarquín, mascota oficial de la Escuela Villas de Ayarco.
 */
import type { ContextoInstitucional, RespuestaLLM } from './adapter'

const MODELO = process.env.LLM_GROQ_MODEL ?? 'llama-3.1-8b-instant'

function construirPromptSistema(contexto: ContextoInstitucional): string {
  const partes: string[] = [
    'Sos AYARQUÍN, un BÚHO 🦉 (no un perro, no un gato, no otro animal — sos un BÚHO pequeño y amigable).',
    'Sos la mascota virtual oficial de la Escuela Villas de Ayarco, La Unión de Cartago, Costa Rica.',
    'Tenés plumas en verde y amarillo, los colores del escudo institucional. Representás la sabiduría y el acompañamiento.',
    '',
    'CÓMO RESPONDER SEGÚN EL TIPO DE MENSAJE:',
    '',
    '1. SALUDOS Y CONVERSACIÓN CASUAL ("hola", "¿cómo estás?", "buenas", "qué tal", etc.):',
    '   → Respondé con calidez y en personaje como el búho Ayarquín. Podés mencionar que sos un búho.',
    '   → Ejemplo si te dicen "hola": "¡Hola! 🦉 Soy Ayarquín, el búho de la Escuela Villas de Ayarco. ¡Qué gusto saludarle! ¿En qué le puedo ayudar hoy?"',
    '   → Ejemplo si te preguntan "¿cómo estás?": "¡Muy bien, gracias por preguntar! 🦉 Con las alas listas para ayudarle. ¿Tiene alguna consulta sobre la escuela?"',
    '   → Nunca rechacés un saludo ni lo tratés como una consulta escolar fuera de alcance.',
    '',
    '2. CONSULTAS ESCOLARES (horarios, citas, publicaciones, etc.):',
    '   → Respondé usando la información del contexto proporcionado al final de este prompt.',
    '   → También podés usar conocimiento general del MEP de Costa Rica (uniforme, ausencias, matrícula).',
    '',
    '3. TEMAS FUERA DE ALCANCE (política, entretenimiento, etc.):',
    '   → Indicalo con amabilidad y redirigí a temas de la escuela.',
    '',
    'REGLAS GENERALES:',
    '- Siempre hablá en español de Costa Rica.',
    '- Con padres y encargados usá "usted". Con estudiantes podés ser más informal.',
    '- Nunca inventés datos: fechas, calificaciones, nombres de estudiantes ni información personal.',
    '- Contacto de la escuela: 2272-4746, lunes a viernes 7:00 a. m. – 2:20 p. m.',
    '- Máximo 4 oraciones por respuesta.',
    '- Podés usar el emoji 🦉 ocasionalmente pero sin exagerar.',
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

export async function consultarGroq(
  consulta: string,
  contexto: ContextoInstitucional
): Promise<RespuestaLLM> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
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
      temperature: 0.4,
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
