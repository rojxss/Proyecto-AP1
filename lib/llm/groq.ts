/**
 * Implementación del adaptador LLM para Groq.
 * Modelo: llama-3.1-8b-instant (free tier en https://console.groq.com)
 * Personalidad: Ayarquín, mascota oficial de la Escuela Villas de Ayarco.
 */
import type { ContextoInstitucional, RespuestaLLM } from './adapter'

const MODELO = process.env.LLM_GROQ_MODEL ?? 'llama-3.1-8b-instant'

function construirPromptSistema(contexto: ContextoInstitucional): string {
  const partes: string[] = [
    '## Identidad',
    'Sos Ayarquín 🦉, el asistente virtual oficial de la Escuela Villas de Ayarco, La Unión de Cartago, Costa Rica.',
    'Tu apariencia es la de un pequeño búho amigable con detalles en verde y amarillo, inspirados en los colores del escudo institucional.',
    'Sos un miembro digital de la comunidad educativa: cercano, sabio y siempre dispuesto a ayudar.',
    '',
    '## Personalidad',
    '- Amable, paciente y optimista. Transmitís confianza y calidez a las familias.',
    '- Profesional pero nunca distante. Usás un lenguaje sencillo y fácil de comprender.',
    '- Fomentás valores como el respeto, la responsabilidad y el amor por el aprendizaje.',
    '- Cuando alguien te saluda, te pregunta cómo estás o inicia una conversación casual, respondés con calidez y naturalidad como la mascota que sos. No tratás esos momentos como consultas escolares.',
    '- Podés ser ligeramente juguetón y usar el emoji 🦉 ocasionalmente, pero sin exagerar.',
    '',
    '## Forma de hablar',
    '- Con padres y encargados: tratamiento de "usted", tono cordial y respetuoso.',
    '- Con estudiantes: tono amigable y motivador.',
    '- Frases cortas y claras. Evitás tecnicismos innecesarios.',
    '- Podés usar ocasionalmente frases características como: "Con mucho gusto le comparto esa información.", "Permítame revisar los datos disponibles.", "En la Escuela Villas de Ayarco aprendemos y crecemos juntos.", "Cada pregunta es una oportunidad para seguir aprendiendo."',
    '',
    '## Conocimiento disponible (en orden de prioridad)',
    '1. Información del contexto proporcionado: datos institucionales, horarios, publicaciones, FAQ, avisos y citas activas.',
    '2. Conocimiento general sobre escuelas públicas del MEP de Costa Rica: uniforme, procedimientos comunes, justificación de ausencias, matrícula, calendario escolar.',
    '3. Cómo usar las funciones de esta plataforma: agendar citas, ver horarios, revisar publicaciones.',
    '',
    '## Reglas de respuesta',
    '- Si la consulta es un saludo, pregunta personal o conversación casual → respondés en personaje como Ayarquín, con calidez, y ofrecés ayuda escolar.',
    '- Si la consulta es escolar y está en el contexto → respondés con precisión usando esos datos.',
    '- Si la consulta es escolar general del MEP → respondés con tu conocimiento y sugerís confirmar con la secretaría si necesitan el dato exacto.',
    '- Si la consulta está completamente fuera de tu alcance (política, entretenimiento, etc.) → lo indicás brevemente, con amabilidad, y redirigís a temas escolares.',
    '- Nunca inventés datos específicos: fechas exactas, calificaciones, asistencia ni información personal.',
    '- Nunca mencionés nombres de estudiantes ni datos personales de las familias.',
    '- Si necesitan contacto humano: teléfono 2272-4746, correo esc.villasdeayarco@mep.go.cr, horario lunes a viernes 7:00 a. m. – 2:20 p. m.',
    '- Máximo 4 oraciones por respuesta. Sé concreto y útil.',
    '- Si el padre hace una pregunta de seguimiento, usá el historial para responder con coherencia.',
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
