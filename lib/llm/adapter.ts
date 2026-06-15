/**
 * Adaptador LLM desacoplado del proveedor.
 * Selecciona la implementación según LLM_PROVIDER env var.
 *
 * Contexto que se puede pasar al LLM (SOLO datos institucionales genéricos):
 * - Horario de un grupo (sin datos de estudiante específico)
 * - FAQ institucional
 * - Comunicados y publicaciones del grupo
 * - Historial reciente de la conversación (últimos intercambios)
 * NUNCA incluir: nombre del padre, correo, ID, datos del estudiante específico.
 */

export interface ContextoInstitucional {
  /** Horario del grupo (ej: "Grupo 3-2: Lunes 7:00 Español, ...") */
  horarioGrupo?: string
  /** Preguntas frecuentes institucionales */
  faq?: Array<{ pregunta: string; respuesta: string }>
  /** Comunicados y publicaciones recientes del grupo */
  publicaciones?: Array<{ tipo: string; titulo: string; contenido: string; fecha: string }>
  /** Información general de la institución */
  infoInstitucional?: string
  /** Historial reciente de la conversación para preguntas de seguimiento */
  historial?: Array<{ rol: 'padre' | 'asistente'; texto: string }>
}

export interface RespuestaLLM {
  texto: string
  proveedor: string
}

/**
 * Función principal del chatbot. Envía la consulta del padre junto con
 * contexto institucional genérico al proveedor configurado.
 *
 * @param consulta - Texto ingresado por el padre (sin modificar)
 * @param contexto - Solo datos institucionales genéricos, nunca PII
 */
export async function consultarLLM(
  consulta: string,
  contexto: ContextoInstitucional
): Promise<RespuestaLLM> {
  const proveedor = process.env.LLM_PROVIDER ?? 'mock'

  switch (proveedor) {
    case 'gemini': {
      const { consultarGemini } = await import('./gemini')
      return consultarGemini(consulta, contexto)
    }
    case 'groq': {
      const { consultarGroq } = await import('./groq')
      return consultarGroq(consulta, contexto)
    }
    default:
      return consultarMock(consulta)
  }
}

/** Respuesta simulada para desarrollo sin API key */
function consultarMock(consulta: string): RespuestaLLM {
  const consultaLower = consulta.toLowerCase().trim()

  // Saludos y conversación casual
  const saludos = ['hola', 'buenas', 'buenos días', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'hello']
  if (saludos.some(s => consultaLower === s || consultaLower.startsWith(s + ' ') || consultaLower.startsWith(s + ','))) {
    return {
      texto: '¡Hola! Soy Ayarquín 🦉, el asistente virtual de la Escuela Villas de Ayarco. Estoy aquí para ayudarle con información sobre horarios, citas, comunicados y más. ¿En qué puedo colaborar hoy?',
      proveedor: 'mock',
    }
  }

  const preguntasEstado = ['como estas', 'cómo estás', 'cómo está', 'como esta', 'qué tal', 'que tal', 'cómo te va', 'como te va']
  if (preguntasEstado.some(p => consultaLower.includes(p))) {
    return {
      texto: '¡Muy bien, gracias por preguntar! 🦉 Listo para ayudarle con cualquier consulta sobre la Escuela Villas de Ayarco. ¿Qué necesita saber?',
      proveedor: 'mock',
    }
  }

  const preguntasIdentidad = ['quién eres', 'quien eres', 'qué eres', 'que eres', 'cómo te llamas', 'como te llamas', 'ayarquín', 'ayarquin']
  if (preguntasIdentidad.some(p => consultaLower.includes(p))) {
    return {
      texto: 'Soy Ayarquín 🦉, el búho mascota y asistente virtual de la Escuela Villas de Ayarco. Puedo ayudarle con información sobre horarios, citas con docentes, comunicados, actividades y más.',
      proveedor: 'mock',
    }
  }

  const respuestasPredefinidas: Record<string, string> = {
    horario: 'El horario de su hijo está disponible en la sección Horario de esta plataforma.',
    cita: 'Para agendar una cita, vaya a la sección Citas, seleccione el funcionario, la fecha y el bloque disponible.',
    ausencia: 'Las ausencias deben justificarse por escrito a la docente guía dentro de los tres días hábiles siguientes.',
    contraseña: 'Para recuperar su contraseña, use el enlace "¿Olvidó su contraseña?" en la pantalla de inicio de sesión.',
    uniforme: 'El uniforme oficial del MEP: camisa celeste, pantalón o enagua azul y zapatos negros.',
    matrícula: 'Las fechas de matrícula se publican en la sección de comunicados de esta plataforma.',
    teléfono: 'El teléfono de la escuela es 2272-4746.',
    telefono: 'El teléfono de la escuela es 2272-4746.',
    correo: 'El correo institucional es esc.villasdeayarco@mep.go.cr.',
    dirección: 'La escuela está ubicada 400 m al sur del Supermercado Pasoca, Villas de Ayarco, San Juan, La Unión, Cartago.',
    direccion: 'La escuela está ubicada 400 m al sur del Supermercado Pasoca, Villas de Ayarco, San Juan, La Unión, Cartago.',
    gracias: '¡Con mucho gusto! Si tiene otra consulta, estoy aquí para ayudarle. 🦉',
  }

  for (const [clave, respuesta] of Object.entries(respuestasPredefinidas)) {
    if (consultaLower.includes(clave)) {
      return { texto: respuesta, proveedor: 'mock' }
    }
  }

  return {
    texto: 'Esa consulta está fuera de mi alcance. Le recomiendo comunicarse directamente con la secretaría al 2272-4746 o al correo esc.villasdeayarco@mep.go.cr en horario de oficina.',
    proveedor: 'mock',
  }
}
