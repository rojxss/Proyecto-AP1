/**
 * scripts/reseed.ts
 * Limpia la base de datos completamente y la repuebla con datos de prueba
 * coherentes para el entorno de demostración de la plataforma.
 *
 * ADVERTENCIA: elimina TODOS los datos existentes, incluidas las cuentas de auth.
 * Ejecutar únicamente en entorno de desarrollo.
 *
 * Uso: npx tsx scripts/reseed.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ── Cargar .env.local sin dependencia de dotenv ───────────────────────────────
function cargarEnv() {
  const ruta = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(ruta)) return
  for (const linea of fs.readFileSync(ruta, 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const idx = l.indexOf('=')
    if (idx < 0) continue
    process.env[l.slice(0, idx).trim()] ??= l.slice(idx + 1).trim()
  }
}
cargarEnv()

// ── Cliente Supabase con service role (bypass RLS) ────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helper: aborta si hay error ───────────────────────────────────────────────
function ok(etiqueta: string, error: unknown) {
  if (error) {
    console.error(`  ✗ ${etiqueta}:`, error)
    process.exit(1)
  }
  console.log(`  ✓ ${etiqueta}`)
}

// ── PASO 1: LIMPIAR ───────────────────────────────────────────────────────────
// Orden estricto para respetar restricciones de FK:
//   posts     → RESTRICT sobre profiles (debe ir antes de borrar auth users)
//   appointments, schedule_entries → RESTRICT sobre time_blocks (antes de borrar time_blocks)
//   Borrar auth users → cascade elimina profiles → cascade a chatbot_logs,
//     appointments, staff_availability, parent_student
//   students, time_blocks, institution_info → al final, sin dependencias

async function limpiar() {
  console.log('\n── PASO 1: Limpiando base de datos ──────────────────────────────')

  ok('posts', (await sb.from('posts').delete().not('id', 'is', null)).error)
  ok('appointments', (await sb.from('appointments').delete().not('id', 'is', null)).error)
  ok('schedule_entries', (await sb.from('schedule_entries').delete().not('id', 'is', null)).error)
  ok('chatbot_logs', (await sb.from('chatbot_logs').delete().not('id', 'is', null)).error)
  ok('staff_availability', (await sb.from('staff_availability').delete().not('id', 'is', null)).error)
  ok('parent_student', (await sb.from('parent_student').delete().not('padre_id', 'is', null)).error)
  ok('access_requests', (await sb.from('access_requests').delete().not('id', 'is', null)).error)

  // Borrar usuarios de auth → cascade elimina profiles y sus dependientes
  const { data: lista, error: errList } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ok('listUsers', errList)
  for (const u of lista.users) {
    const { error } = await sb.auth.admin.deleteUser(u.id)
    if (error) { console.error(`  ✗ deleteUser(${u.email}):`, error); process.exit(1) }
    console.log(`  ✓   auth eliminado: ${u.email}`)
  }

  ok('students', (await sb.from('students').delete().not('id', 'is', null)).error)
  ok('time_blocks', (await sb.from('time_blocks').delete().not('id', 'is', null)).error)
  ok('institution_info', (await sb.from('institution_info').delete().not('id', 'is', null)).error)
}

// ── PASO 2: INSTITUTION INFO ──────────────────────────────────────────────────

async function insertarInstitucion() {
  console.log('\n── PASO 2: Insertando institution_info ──────────────────────────')

  const filas = [
    // Datos verificados (CLAUDE.md § 9)
    { clave: 'nombre',     valor: 'Escuela Villas de Ayarco',                                                          tipo: 'texto',   orden: 1,  validado: true  },
    { clave: 'lugar',      valor: 'La Unión de Cartago',                                                               tipo: 'texto',   orden: 2,  validado: true  },
    { clave: 'direccion',  valor: '400 m al sur del Supermercado Pasoca, Villas de Ayarco, San Juan, La Unión, Cartago', tipo: 'texto',  orden: 3,  validado: true  },
    { clave: 'telefono',   valor: '2272-4746',                                                                         tipo: 'texto',   orden: 4,  validado: true  },
    { clave: 'correo',     valor: 'esc.villasdeayarco@mep.go.cr',                                                      tipo: 'texto',   orden: 5,  validado: true  },
    { clave: 'jornada',    valor: 'Lunes a viernes, 7:00 a. m. – 2:20 p. m.',                                         tipo: 'texto',   orden: 6,  validado: true  },
    { clave: 'directora',  valor: 'M.A.Ed. Kimberly Bonilla Noguera',                                                 tipo: 'texto',   orden: 7,  validado: true  },
    { clave: 'secretaria', valor: 'Josseline Ilama Navarro',                                                           tipo: 'texto',   orden: 8,  validado: true  },
    { clave: 'circuito',   valor: 'Circuito 06, Dirección Regional de Educación de Cartago',                          tipo: 'texto',   orden: 9,  validado: true  },
    { clave: 'fundacion',  valor: '1991',                                                                              tipo: 'texto',   orden: 10, validado: false },
    { clave: 'poblacion',  valor: 'Aproximadamente 662 estudiantes',                                                   tipo: 'texto',   orden: 11, validado: true  },
    // Aviso de plataforma en prueba
    { clave: 'aviso_1', valor: 'La plataforma está en período de prueba. Comunique cualquier inconveniente a la secretaría al 2272-4746.', tipo: 'aviso', orden: 1, validado: true },
    // Servicios de apoyo
    { clave: 'servicio_1', valor: 'Terapia del lenguaje',   tipo: 'servicio', orden: 1, validado: true },
    { clave: 'servicio_2', valor: 'Terapia emocional',      tipo: 'servicio', orden: 2, validado: true },
    { clave: 'servicio_3', valor: 'Apoyo al aprendizaje',   tipo: 'servicio', orden: 3, validado: true },
    { clave: 'servicio_4', valor: 'Aula integrada',         tipo: 'servicio', orden: 4, validado: true },
    { clave: 'servicio_5', valor: 'Orientación',            tipo: 'servicio', orden: 5, validado: true },
    // FAQ semilla (validada: false hasta confirmación con la institución)
    { clave: 'faq_1', valor: JSON.stringify({ pregunta: '¿Cuál es el horario de atención de la escuela?', respuesta: 'La escuela atiende de lunes a viernes de 7:00 a. m. a 2:20 p. m.' }), tipo: 'faq', orden: 1, validado: false },
    { clave: 'faq_2', valor: JSON.stringify({ pregunta: '¿Cómo agendo una cita con el docente de mi hijo?', respuesta: 'Ingrese a la plataforma, seleccione «Citas» en el menú, elija al funcionario, la fecha disponible y el bloque horario.' }), tipo: 'faq', orden: 2, validado: false },
    { clave: 'faq_3', valor: JSON.stringify({ pregunta: '¿Cómo justifico la ausencia de mi hijo?', respuesta: 'Presente la justificación por escrito en secretaría dentro de los 3 días hábiles siguientes a la ausencia.' }), tipo: 'faq', orden: 3, validado: false },
    { clave: 'faq_4', valor: JSON.stringify({ pregunta: '¿Qué documentos se necesitan para la matrícula?', respuesta: 'Constancia de nacimiento, carné de vacunas actualizado y comprobante de domicilio.' }), tipo: 'faq', orden: 4, validado: false },
    { clave: 'faq_5', valor: JSON.stringify({ pregunta: '¿Qué servicios de apoyo ofrece la escuela?', respuesta: 'La escuela cuenta con terapia del lenguaje, terapia emocional, apoyo al aprendizaje, aula integrada y orientación.' }), tipo: 'faq', orden: 5, validado: false },
    { clave: 'faq_6', valor: JSON.stringify({ pregunta: '¿Olvidé mi contraseña, qué hago?', respuesta: 'En la pantalla de ingreso haga clic en «¿Olvidó su contraseña?». Recibirá un enlace por correo electrónico válido por 30 minutos.' }), tipo: 'faq', orden: 6, validado: false },
    { clave: 'faq_7', valor: JSON.stringify({ pregunta: '¿Cómo me comunico con la dirección?', respuesta: 'Puede llamar al 2272-4746 o escribir a esc.villasdeayarco@mep.go.cr en horario de lunes a viernes de 7:00 a. m. a 2:20 p. m.' }), tipo: 'faq', orden: 7, validado: false },
    { clave: 'faq_8', valor: JSON.stringify({ pregunta: '¿Cuál es el uniforme oficial?', respuesta: 'El uniforme es el establecido por el Ministerio de Educación Pública (MEP). Consulte la secretaría para detalles específicos.' }), tipo: 'faq', orden: 8, validado: false },
  ]

  const { error } = await sb.from('institution_info').insert(filas)
  ok(`institution_info (${filas.length} filas)`, error)
}

// ── PASO 3: TIME BLOCKS ───────────────────────────────────────────────────────

async function insertarTimeBlocks(): Promise<Record<string, string>> {
  console.log('\n── PASO 3: Insertando time_blocks ───────────────────────────────')

  const bloques = [
    { etiqueta: '7:00 – 7:40',   orden: 1,  es_receso: false, es_almuerzo: false },
    { etiqueta: '7:40 – 8:20',   orden: 2,  es_receso: false, es_almuerzo: false },
    { etiqueta: '8:20 – 9:00',   orden: 3,  es_receso: false, es_almuerzo: false },
    { etiqueta: '9:00 – 9:20',   orden: 4,  es_receso: true,  es_almuerzo: false },
    { etiqueta: '9:20 – 10:00',  orden: 5,  es_receso: false, es_almuerzo: false },
    { etiqueta: '10:00 – 10:40', orden: 6,  es_receso: false, es_almuerzo: false },
    { etiqueta: '10:40 – 11:30', orden: 7,  es_receso: false, es_almuerzo: true  },
    { etiqueta: '11:30 – 12:10', orden: 8,  es_receso: false, es_almuerzo: false },
    { etiqueta: '12:10 – 12:50', orden: 9,  es_receso: false, es_almuerzo: false },
    { etiqueta: '12:50 – 1:30',  orden: 10, es_receso: false, es_almuerzo: false },
    { etiqueta: '1:30 – 2:20',   orden: 11, es_receso: false, es_almuerzo: false },
  ]

  const { data, error } = await sb.from('time_blocks').insert(bloques).select('id, etiqueta')
  ok(`time_blocks (${bloques.length} bloques)`, error)

  // Devuelve mapa etiqueta → id para referencias posteriores
  return Object.fromEntries(data!.map(b => [b.etiqueta, b.id]))
}

// ── PASO 4: USUARIOS ──────────────────────────────────────────────────────────

async function crearUsuario(email: string, nombre: string, rol: string): Promise<string> {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: 'Escuela2026*',
    email_confirm: true,
    user_metadata: { nombre_completo: nombre, rol },
  })
  if (error) { console.error(`  ✗ crearUsuario(${email}):`, error); process.exit(1) }
  console.log(`  ✓ ${rol.padEnd(7)}  ${nombre}  <${email}>`)
  return data.user!.id
}

// ── PASO 5: ESTUDIANTES + VÍNCULOS ────────────────────────────────────────────

interface DefEstudiante { nombre: string; nivel: string; grupo: string }

async function insertarEstudiantes(defs: DefEstudiante[]): Promise<string[]> {
  const { data, error } = await sb
    .from('students')
    .insert(defs.map(d => ({ nombre_completo: d.nombre, nivel: d.nivel, grupo: d.grupo })))
    .select('id')
  ok(`students (${defs.length})`, error)
  return data!.map(r => r.id)
}

// ── PASO 6: HORARIO ────────────────────────────────────────────────────────────

async function insertarHorario(
  bloques: Record<string, string>,
  idAna: string,
  idCarlos: string,
) {
  console.log('\n── PASO 6: Insertando horario grupo 3-2 ─────────────────────────')

  type DiaEnum = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'
  const entradas: { dia: DiaEnum; bloque: string; materia: string; docente_id: string }[] = [
    // Bloque 1: 7:00-7:40
    { dia: 'Lunes',     bloque: '7:00 – 7:40',   materia: 'Matemáticas',       docente_id: idAna    },
    { dia: 'Martes',    bloque: '7:00 – 7:40',   materia: 'Español',           docente_id: idAna    },
    { dia: 'Miércoles', bloque: '7:00 – 7:40',   materia: 'Ciencias',          docente_id: idCarlos },
    { dia: 'Jueves',    bloque: '7:00 – 7:40',   materia: 'Matemáticas',       docente_id: idAna    },
    { dia: 'Viernes',   bloque: '7:00 – 7:40',   materia: 'Español',           docente_id: idAna    },
    // Bloque 2: 7:40-8:20
    { dia: 'Lunes',     bloque: '7:40 – 8:20',   materia: 'Español',           docente_id: idAna    },
    { dia: 'Martes',    bloque: '7:40 – 8:20',   materia: 'Matemáticas',       docente_id: idAna    },
    { dia: 'Miércoles', bloque: '7:40 – 8:20',   materia: 'Estudios Sociales', docente_id: idCarlos },
    { dia: 'Jueves',    bloque: '7:40 – 8:20',   materia: 'Ciencias',          docente_id: idCarlos },
    { dia: 'Viernes',   bloque: '7:40 – 8:20',   materia: 'Matemáticas',       docente_id: idAna    },
    // Bloque 3: 8:20-9:00
    { dia: 'Lunes',     bloque: '8:20 – 9:00',   materia: 'Ciencias',          docente_id: idCarlos },
    { dia: 'Martes',    bloque: '8:20 – 9:00',   materia: 'Estudios Sociales', docente_id: idCarlos },
    { dia: 'Miércoles', bloque: '8:20 – 9:00',   materia: 'Matemáticas',       docente_id: idAna    },
    { dia: 'Jueves',    bloque: '8:20 – 9:00',   materia: 'Español',           docente_id: idAna    },
    { dia: 'Viernes',   bloque: '8:20 – 9:00',   materia: 'Educación Física',  docente_id: idCarlos },
    // Bloque 5: 9:20-10:00 (posterior al receso)
    { dia: 'Lunes',     bloque: '9:20 – 10:00',  materia: 'Estudios Sociales', docente_id: idCarlos },
    { dia: 'Martes',    bloque: '9:20 – 10:00',  materia: 'Ciencias',          docente_id: idCarlos },
    { dia: 'Miércoles', bloque: '9:20 – 10:00',  materia: 'Español',           docente_id: idAna    },
    { dia: 'Jueves',    bloque: '9:20 – 10:00',  materia: 'Artes Plásticas',   docente_id: idCarlos },
    { dia: 'Viernes',   bloque: '9:20 – 10:00',  materia: 'Ciencias',          docente_id: idCarlos },
    // Bloque 6: 10:00-10:40
    { dia: 'Lunes',     bloque: '10:00 – 10:40', materia: 'Educación Física',  docente_id: idCarlos },
    { dia: 'Martes',    bloque: '10:00 – 10:40', materia: 'Artes Plásticas',   docente_id: idCarlos },
    { dia: 'Miércoles', bloque: '10:00 – 10:40', materia: 'Matemáticas',       docente_id: idAna    },
    { dia: 'Jueves',    bloque: '10:00 – 10:40', materia: 'Estudios Sociales', docente_id: idCarlos },
    { dia: 'Viernes',   bloque: '10:00 – 10:40', materia: 'Español',           docente_id: idAna    },
    // Bloque 8: 11:30-12:10 (posterior al almuerzo)
    { dia: 'Lunes',     bloque: '11:30 – 12:10', materia: 'Español',           docente_id: idAna    },
    { dia: 'Martes',    bloque: '11:30 – 12:10', materia: 'Matemáticas',       docente_id: idAna    },
    { dia: 'Miércoles', bloque: '11:30 – 12:10', materia: 'Ciencias',          docente_id: idCarlos },
    { dia: 'Jueves',    bloque: '11:30 – 12:10', materia: 'Español',           docente_id: idAna    },
    { dia: 'Viernes',   bloque: '11:30 – 12:10', materia: 'Estudios Sociales', docente_id: idCarlos },
    // Bloque 9: 12:10-12:50
    { dia: 'Lunes',     bloque: '12:10 – 12:50', materia: 'Matemáticas',       docente_id: idAna    },
    { dia: 'Martes',    bloque: '12:10 – 12:50', materia: 'Español',           docente_id: idAna    },
    { dia: 'Miércoles', bloque: '12:10 – 12:50', materia: 'Estudios Sociales', docente_id: idCarlos },
    { dia: 'Jueves',    bloque: '12:10 – 12:50', materia: 'Ciencias',          docente_id: idCarlos },
    { dia: 'Viernes',   bloque: '12:10 – 12:50', materia: 'Artes Plásticas',   docente_id: idCarlos },
    // Bloque 10: 12:50-1:30
    { dia: 'Lunes',     bloque: '12:50 – 1:30',  materia: 'Artes Plásticas',   docente_id: idCarlos },
    { dia: 'Martes',    bloque: '12:50 – 1:30',  materia: 'Educación Física',  docente_id: idCarlos },
    { dia: 'Miércoles', bloque: '12:50 – 1:30',  materia: 'Español',           docente_id: idAna    },
    { dia: 'Jueves',    bloque: '12:50 – 1:30',  materia: 'Matemáticas',       docente_id: idAna    },
    { dia: 'Viernes',   bloque: '12:50 – 1:30',  materia: 'Ciencias',          docente_id: idCarlos },
    // Bloque 11: 1:30-2:20
    { dia: 'Lunes',     bloque: '1:30 – 2:20',   materia: 'Ciencias',          docente_id: idCarlos },
    { dia: 'Martes',    bloque: '1:30 – 2:20',   materia: 'Estudios Sociales', docente_id: idCarlos },
    { dia: 'Miércoles', bloque: '1:30 – 2:20',   materia: 'Educación Física',  docente_id: idCarlos },
    { dia: 'Jueves',    bloque: '1:30 – 2:20',   materia: 'Artes Plásticas',   docente_id: idCarlos },
    { dia: 'Viernes',   bloque: '1:30 – 2:20',   materia: 'Matemáticas',       docente_id: idAna    },
  ]

  const filas = entradas.map(e => ({
    grupo: '3-2',
    dia: e.dia,
    bloque_id: bloques[e.bloque],
    materia: e.materia,
    docente_id: e.docente_id,
    aula: 'Aula 3-2',
  }))

  const { error } = await sb.from('schedule_entries').insert(filas)
  ok(`schedule_entries (${filas.length} entradas)`, error)
}

// ── PASO 7: DISPONIBILIDAD DOCENTES ──────────────────────────────────────────

async function insertarDisponibilidad(
  bloques: Record<string, string>,
  idAna: string,
  idCarlos: string,
) {
  console.log('\n── PASO 7: Insertando disponibilidad docentes ────────────────────')

  type DiaEnum = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'
  const dias: DiaEnum[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  // Solo bloques lectivos (excluye receso y almuerzo)
  const bloquesLectivos = [
    '7:00 – 7:40', '7:40 – 8:20', '8:20 – 9:00',
    '9:20 – 10:00', '10:00 – 10:40',
    '11:30 – 12:10', '12:10 – 12:50', '12:50 – 1:30', '1:30 – 2:20',
  ]

  const filas = []
  for (const docId of [idAna, idCarlos]) {
    for (const dia of dias) {
      for (const etiq of bloquesLectivos) {
        filas.push({ funcionario_id: docId, dia, bloque_id: bloques[etiq], disponible: true })
      }
    }
  }

  const { error } = await sb.from('staff_availability').insert(filas)
  ok(`staff_availability (${filas.length} filas)`, error)
}

// ── PASO 8: PUBLICACIONES ─────────────────────────────────────────────────────

async function insertarPublicaciones(
  idDirectora: string,
  idSecretaria: string,
  idAna: string,
  idCarlos: string,
) {
  console.log('\n── PASO 8: Insertando publicaciones ─────────────────────────────')

  const ahora  = new Date()
  const fecha  = (d: Date) => d.toISOString().split('T')[0]
  const dias   = (n: number) => { const r = new Date(ahora); r.setDate(r.getDate() + n); return r }

  const filas = [
    {
      tipo: 'comunicado',
      titulo: 'Bienvenida al sistema de gestión escolar',
      contenido: 'Estimados padres de familia: les damos la bienvenida a la plataforma digital de la Escuela Villas de Ayarco. Aquí podrán consultar horarios, agendar citas con docentes y mantenerse informados sobre actividades y comunicados. Ante cualquier consulta, comuníquese con la secretaría al 2272-4746.',
      segmento: 'todos', segmento_valor: null,
      autor_id: idDirectora,
    },
    {
      tipo: 'evento',
      titulo: 'Reunión de padres de familia — Tercer grado',
      contenido: 'Se convoca a los padres de familia de todos los grupos de tercer grado a una reunión informativa sobre el avance académico del segundo semestre y las actividades de cierre de año.',
      fecha_evento: fecha(dias(7)), hora_evento: '17:30:00', lugar: 'Salón multiusos de la escuela',
      segmento: 'nivel', segmento_valor: '3.er grado',
      autor_id: idDirectora,
    },
    {
      tipo: 'actividad',
      titulo: 'Proyecto de Ciencias — Maqueta del sistema solar',
      contenido: 'Los estudiantes deben elaborar una maqueta del sistema solar con materiales reciclados. Se evaluará creatividad, exactitud científica y presentación oral ante el grupo.',
      fecha_asignacion: fecha(ahora), fecha_limite: fecha(dias(14)),
      segmento: 'grupo', segmento_valor: '3-2',
      autor_id: idCarlos,
    },
    {
      tipo: 'comunicado',
      titulo: 'Suspensión de lecciones — Feriado nacional',
      contenido: 'Se informa a los padres de familia que el próximo lunes no habrá lecciones por motivo de feriado nacional. Las actividades académicas se reanudarán el martes siguiente con normalidad.',
      segmento: 'todos', segmento_valor: null,
      autor_id: idSecretaria,
    },
    {
      tipo: 'actividad',
      titulo: 'Lectura comprensiva — Capítulo 4 de Español',
      contenido: 'Los estudiantes deben leer el capítulo 4 del libro de texto de Español y completar el cuestionario de comprensión lectora entregado en clase. Se revisará el próximo miércoles.',
      fecha_asignacion: fecha(ahora), fecha_limite: fecha(dias(5)),
      segmento: 'grupo', segmento_valor: '3-2',
      autor_id: idAna,
    },
  ]

  const { error } = await sb.from('posts').insert(filas)
  ok(`posts (${filas.length})`, error)
}

// ── PASO 9: CITAS ─────────────────────────────────────────────────────────────

async function insertarCitas(
  bloques: Record<string, string>,
  idLaura: string,
  idRoberto: string,
  idMaria: string,
  idAna: string,
  idCarlos: string,
) {
  console.log('\n── PASO 9: Insertando citas de ejemplo ──────────────────────────')

  const ahora = new Date()
  const fecha = (d: Date) => d.toISOString().split('T')[0]
  const dias  = (n: number) => { const r = new Date(ahora); r.setDate(r.getDate() + n); return r }

  const filas = [
    {
      padre_id: idLaura, funcionario_id: idAna,
      fecha: fecha(dias(3)), bloque_id: bloques['9:20 – 10:00'],
      motivo: 'Quisiera consultar sobre el rendimiento de Sebastián en Matemáticas durante las últimas semanas y cómo puedo apoyarlo en casa.',
      estado: 'Pendiente',
    },
    {
      padre_id: idRoberto, funcionario_id: idCarlos,
      fecha: fecha(dias(5)), bloque_id: bloques['10:00 – 10:40'],
      motivo: 'Me gustaría hablar sobre el proyecto de Ciencias y las estrategias que puedo usar para ayudar a Mateo en casa.',
      estado: 'Confirmada',
    },
    {
      padre_id: idMaria, funcionario_id: idAna,
      fecha: fecha(dias(-2)), bloque_id: bloques['11:30 – 12:10'],
      motivo: 'Consulta sobre la adaptación de Daniela al nuevo año escolar y su participación en clase.',
      estado: 'Completada',
    },
  ]

  const { error } = await sb.from('appointments').insert(filas)
  ok(`appointments (${filas.length})`, error)
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  RESEED — Plataforma Escolar Villas de Ayarco')
  console.log('  ADVERTENCIA: elimina TODOS los datos existentes')
  console.log('═══════════════════════════════════════════════════════════════')

  await limpiar()
  await insertarInstitucion()
  const bloques = await insertarTimeBlocks()

  console.log('\n── PASO 4: Creando usuarios ─────────────────────────────────────')
  const idJohn       = await crearUsuario('cdrpadilla28@gmail.com',                           'John Sebastián Ceciliano Piedra', 'admin')
  const idDirectora  = await crearUsuario('escuelavillasdeayarcopage+directora@gmail.com',    'Kimberly Bonilla Noguera',        'admin')
  const idSecretaria = await crearUsuario('escuelavillasdeayarcopage+secretaria@gmail.com',   'Josseline Ilama Navarro',         'admin')
  const idAna        = await crearUsuario('escuelavillasdeayarcopage+docente1@gmail.com',     'Ana Lucía Ramírez Solís',         'docente')
  const idCarlos     = await crearUsuario('escuelavillasdeayarcopage+docente2@gmail.com',     'Carlos Andrés Mora Jiménez',      'docente')
  const idLaura      = await crearUsuario('escuelavillasdeayarcopage+madre1@gmail.com',       'Laura Patricia Hernández Rojas',  'padre')
  const idRoberto    = await crearUsuario('escuelavillasdeayarcopage+padre2@gmail.com',       'Roberto Alonso Vargas Chaves',    'padre')
  const idMaria      = await crearUsuario('escuelavillasdeayarcopage+madre3@gmail.com',       'María Fernanda Solano Brenes',    'padre')

  // Esperar al trigger on_auth_user_created para que los profiles existan
  console.log('\n  Esperando trigger de creación de perfiles…')
  await new Promise(r => setTimeout(r, 3000))

  console.log('\n── PASO 5: Estudiantes y vínculos ───────────────────────────────')
  const estudianteDefs: DefEstudiante[] = [
    { nombre: 'Sebastián Hernández Vargas', nivel: '3.er grado', grupo: '3-2' },
    { nombre: 'Valeria Hernández Vargas',   nivel: '5.º grado',  grupo: '5-1' },
    { nombre: 'Mateo Vargas Solano',        nivel: '3.er grado', grupo: '3-2' },
    { nombre: 'Daniela Solano Brenes',      nivel: '2.º grado',  grupo: '2-1' },
  ]
  const [idSebastian, idValeria, idMateo, idDaniela] = await insertarEstudiantes(estudianteDefs)

  const vinculos = [
    { padre_id: idLaura,   estudiante_id: idSebastian },
    { padre_id: idLaura,   estudiante_id: idValeria   },
    { padre_id: idRoberto, estudiante_id: idMateo     },
    { padre_id: idMaria,   estudiante_id: idDaniela   },
  ]
  const { error: errV } = await sb.from('parent_student').insert(vinculos)
  ok('parent_student (4 vínculos)', errV)

  await insertarHorario(bloques, idAna, idCarlos)
  await insertarDisponibilidad(bloques, idAna, idCarlos)
  await insertarPublicaciones(idDirectora, idSecretaria, idAna, idCarlos)
  await insertarCitas(bloques, idLaura, idRoberto, idMaria, idAna, idCarlos)

  // ── Resumen ──────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  ✓ RESEED COMPLETADO EXITOSAMENTE')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('\nCuentas creadas — contraseña para todas: Escuela2026*\n')

  const cuentas = [
    { rol: 'admin',   email: 'cdrpadilla28@gmail.com',                         nombre: 'John Sebastián Ceciliano Piedra' },
    { rol: 'admin',   email: 'escuelavillasdeayarcopage+directora@gmail.com',  nombre: 'Kimberly Bonilla Noguera'        },
    { rol: 'admin',   email: 'escuelavillasdeayarcopage+secretaria@gmail.com', nombre: 'Josseline Ilama Navarro'         },
    { rol: 'docente', email: 'escuelavillasdeayarcopage+docente1@gmail.com',   nombre: 'Ana Lucía Ramírez Solís'         },
    { rol: 'docente', email: 'escuelavillasdeayarcopage+docente2@gmail.com',   nombre: 'Carlos Andrés Mora Jiménez'      },
    { rol: 'padre',   email: 'escuelavillasdeayarcopage+madre1@gmail.com',     nombre: 'Laura Patricia Hernández Rojas'  },
    { rol: 'padre',   email: 'escuelavillasdeayarcopage+padre2@gmail.com',     nombre: 'Roberto Alonso Vargas Chaves'    },
    { rol: 'padre',   email: 'escuelavillasdeayarcopage+madre3@gmail.com',     nombre: 'María Fernanda Solano Brenes'    },
  ]
  for (const c of cuentas) {
    console.log(`  ${c.rol.padEnd(7)}  ${c.email.padEnd(53)}  ${c.nombre}`)
  }
  console.log()
}

main().catch(err => { console.error('\n✗ ERROR FATAL:', err); process.exit(1) })
