/**
 * scripts/reseed.ts
 * Limpia la base de datos completamente y la repuebla con datos de demostración
 * que cubren TODAS las funciones actuales del sistema.
 *
 * ADVERTENCIA: elimina TODOS los datos, incluidas las cuentas de auth.
 * Solo para entorno de desarrollo / demostración.
 *
 * Uso: npx tsx scripts/reseed.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ── Cargar .env.local sin depender de dotenv ──────────────────────────────────
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Generador de contraseña segura aleatoria ──────────────────────────────────
function generarPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  let r = ''
  for (let i = 0; i < 12; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return r
}

// ── Helper ────────────────────────────────────────────────────────────────────
function ok(etiqueta: string, error: unknown) {
  if (error) { console.error(`  ✗ ${etiqueta}:`, error); process.exit(1) }
  console.log(`  ✓ ${etiqueta}`)
}
const fecha = (d: Date) => d.toISOString().split('T')[0]
const dias  = (n: number) => { const r = new Date(); r.setDate(r.getDate() + n); return r }

// ── PASO 1: LIMPIAR ───────────────────────────────────────────────────────────
async function limpiar() {
  console.log('\n── PASO 1: Limpiando base de datos ──────────────────────────────')
  ok('posts',            (await sb.from('posts').delete().not('id', 'is', null)).error)
  ok('appointments',     (await sb.from('appointments').delete().not('id', 'is', null)).error)
  ok('schedule_entries', (await sb.from('schedule_entries').delete().not('id', 'is', null)).error)
  ok('chatbot_logs',     (await sb.from('chatbot_logs').delete().not('id', 'is', null)).error)
  ok('staff_availability',(await sb.from('staff_availability').delete().not('id', 'is', null)).error)
  ok('parent_student',   (await sb.from('parent_student').delete().not('padre_id', 'is', null)).error)
  ok('access_requests',  (await sb.from('access_requests').delete().not('id', 'is', null)).error)

  const { data: lista, error: errList } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ok('listUsers', errList)
  for (const u of lista.users) {
    const { error } = await sb.auth.admin.deleteUser(u.id)
    if (error) { console.error(`  ✗ deleteUser(${u.email}):`, error); process.exit(1) }
    console.log(`  ✓   eliminado: ${u.email}`)
  }

  ok('students',         (await sb.from('students').delete().not('id', 'is', null)).error)
  ok('time_blocks',      (await sb.from('time_blocks').delete().not('id', 'is', null)).error)
  ok('institution_info', (await sb.from('institution_info').delete().not('id', 'is', null)).error)
}

// ── PASO 2: INSTITUTION_INFO ─────────────────────────────────────────────────
async function insertarInstitucion() {
  console.log('\n── PASO 2: institution_info ─────────────────────────────────────')
  const { error } = await sb.from('institution_info').insert([
    { clave: 'nombre',     valor: 'Escuela Villas de Ayarco',                                                             tipo: 'texto',   orden: 1,  validado: true  },
    { clave: 'lugar',      valor: 'La Unión de Cartago',                                                                  tipo: 'texto',   orden: 2,  validado: true  },
    { clave: 'direccion',  valor: '400 m al sur del Supermercado Pasoca, Villas de Ayarco, San Juan, La Unión, Cartago',  tipo: 'texto',   orden: 3,  validado: true  },
    { clave: 'telefono',   valor: '2272-4746',                                                                            tipo: 'texto',   orden: 4,  validado: true  },
    { clave: 'correo',     valor: 'esc.villasdeayarco@mep.go.cr',                                                         tipo: 'texto',   orden: 5,  validado: true  },
    { clave: 'jornada',    valor: 'Lunes a viernes, 7:00 a. m. – 2:20 p. m.',                                            tipo: 'texto',   orden: 6,  validado: true  },
    { clave: 'directora',  valor: 'M.A.Ed. Kimberly Bonilla Noguera',                                                    tipo: 'texto',   orden: 7,  validado: true  },
    { clave: 'secretaria', valor: 'Josseline Ilama Navarro',                                                              tipo: 'texto',   orden: 8,  validado: true  },
    { clave: 'circuito',   valor: 'Circuito 06, Dirección Regional de Educación de Cartago',                             tipo: 'texto',   orden: 9,  validado: true  },
    { clave: 'fundacion',  valor: '1991',                                                                                 tipo: 'texto',   orden: 10, validado: false },
    { clave: 'poblacion',  valor: 'Aproximadamente 662 estudiantes',                                                      tipo: 'texto',   orden: 11, validado: true  },
    { clave: 'resena',     valor: 'La Escuela Villas de Ayarco nació de las necesidades de la comunidad en 1991. A lo largo de más de tres décadas ha ofrecido educación de calidad a cientos de familias de La Unión, Cartago, comprometida con el desarrollo integral de la niñez costarricense.', tipo: 'texto', orden: 12, validado: false },
    // Avisos del tablón
    { clave: 'aviso_1', valor: `14 jun 2026|||Plataforma en prueba|||El sistema de gestión escolar está en período de prueba. Comunique cualquier inconveniente a la secretaría al 2272-4746.`,        tipo: 'aviso', orden: 1, validado: true },
    { clave: 'aviso_2', valor: `20 jun 2026|||Reunión de padres de familia|||Se convoca a los padres de familia a la reunión informativa del segundo semestre, el viernes 20 de junio a las 5:30 p. m.`, tipo: 'aviso', orden: 2, validado: true },
    { clave: 'aviso_3', valor: `25 jun 2026|||Feria de Ciencias|||El 25 de junio se realizará la Feria de Ciencias. Se invita a toda la comunidad educativa a participar.`,                           tipo: 'aviso', orden: 3, validado: true },
    // Servicios
    { clave: 'servicio_1', valor: 'Terapia del lenguaje',   tipo: 'servicio', orden: 1, validado: true },
    { clave: 'servicio_2', valor: 'Terapia emocional',      tipo: 'servicio', orden: 2, validado: true },
    { clave: 'servicio_3', valor: 'Apoyo al aprendizaje',   tipo: 'servicio', orden: 3, validado: true },
    { clave: 'servicio_4', valor: 'Aula integrada',         tipo: 'servicio', orden: 4, validado: true },
    { clave: 'servicio_5', valor: 'Orientación',            tipo: 'servicio', orden: 5, validado: true },
    // FAQ (formato JSON para pregunta y respuesta separadas)
    { clave: 'faq_1', valor: JSON.stringify({ pregunta: '¿Cuál es el horario de atención de la escuela?',           respuesta: 'La escuela atiende de lunes a viernes de 7:00 a. m. a 2:20 p. m.' }),                                                                                                   tipo: 'faq', orden: 1, validado: false },
    { clave: 'faq_2', valor: JSON.stringify({ pregunta: '¿Cómo agendo una cita con el docente de mi hijo?',         respuesta: 'Ingrese a la plataforma, vaya a «Citas» y seleccione el funcionario, la fecha y el bloque disponible.' }),                                                            tipo: 'faq', orden: 2, validado: false },
    { clave: 'faq_3', valor: JSON.stringify({ pregunta: '¿Cómo justifico la ausencia de mi hijo?',                  respuesta: 'Presente la justificación por escrito en secretaría dentro de los 3 días hábiles siguientes a la ausencia.' }),                                                       tipo: 'faq', orden: 3, validado: false },
    { clave: 'faq_4', valor: JSON.stringify({ pregunta: '¿Qué documentos se necesitan para la matrícula?',          respuesta: 'Constancia de nacimiento, carné de vacunas actualizado y comprobante de domicilio.' }),                                                                               tipo: 'faq', orden: 4, validado: false },
    { clave: 'faq_5', valor: JSON.stringify({ pregunta: '¿Qué servicios de apoyo ofrece la escuela?',               respuesta: 'La escuela cuenta con terapia del lenguaje, terapia emocional, apoyo al aprendizaje, aula integrada y orientación.' }),                                             tipo: 'faq', orden: 5, validado: false },
    { clave: 'faq_6', valor: JSON.stringify({ pregunta: '¿Olvidé mi contraseña, qué hago?',                         respuesta: 'En la pantalla de ingreso haga clic en «¿Olvidó su contraseña?». Recibirá un enlace válido por 30 minutos en su correo.' }),                                        tipo: 'faq', orden: 6, validado: false },
    { clave: 'faq_7', valor: JSON.stringify({ pregunta: '¿Cómo me comunico con la dirección?',                      respuesta: 'Puede llamar al 2272-4746 o escribir a esc.villasdeayarco@mep.go.cr, de lunes a viernes de 7:00 a. m. a 2:20 p. m.' }),                                            tipo: 'faq', orden: 7, validado: false },
    { clave: 'faq_8', valor: JSON.stringify({ pregunta: '¿Cuál es el uniforme oficial?',                             respuesta: 'El uniforme es el establecido por el MEP. Consulte la secretaría para detalles específicos de su grupo.' }),                                                          tipo: 'faq', orden: 8, validado: false },
  ])
  ok('institution_info (33 filas)', error)
}

// ── PASO 3: TIME BLOCKS ───────────────────────────────────────────────────────
async function insertarTimeBlocks(): Promise<Record<string, string>> {
  console.log('\n── PASO 3: time_blocks ──────────────────────────────────────────')
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
  ok('time_blocks (11)', error)
  return Object.fromEntries(data!.map(b => [b.etiqueta, b.id]))
}

// ── PASO 4: USUARIOS ──────────────────────────────────────────────────────────
interface UsuarioSeed {
  email: string
  nombre: string
  rol: 'admin' | 'docente' | 'padre'
  password: string
  id?: string
}

async function crearUsuarios(): Promise<UsuarioSeed[]> {
  console.log('\n── PASO 4: Creando usuarios ─────────────────────────────────────')

  const defs: Omit<UsuarioSeed, 'id'>[] = [
    { email: 'cdrpadilla28@gmail.com',                           nombre: 'John Sebastián Ceciliano Piedra', rol: 'admin',   password: generarPassword() },
    { email: 'escuelavillasdeayarcopage+directora@gmail.com',    nombre: 'Kimberly Bonilla Noguera',        rol: 'admin',   password: generarPassword() },
    { email: 'escuelavillasdeayarcopage+secretaria@gmail.com',   nombre: 'Josseline Ilama Navarro',         rol: 'admin',   password: generarPassword() },
    { email: 'escuelavillasdeayarcopage+docente1@gmail.com',     nombre: 'Ana Lucía Ramírez Solís',         rol: 'docente', password: generarPassword() },
    { email: 'escuelavillasdeayarcopage+docente2@gmail.com',     nombre: 'Carlos Andrés Mora Jiménez',      rol: 'docente', password: generarPassword() },
    { email: 'escuelavillasdeayarcopage+madre1@gmail.com',       nombre: 'Laura Patricia Hernández Rojas',  rol: 'padre',   password: generarPassword() },
    { email: 'escuelavillasdeayarcopage+padre2@gmail.com',       nombre: 'Roberto Alonso Vargas Chaves',    rol: 'padre',   password: generarPassword() },
    { email: 'escuelavillasdeayarcopage+madre3@gmail.com',       nombre: 'María Fernanda Solano Brenes',    rol: 'padre',   password: generarPassword() },
  ]

  const resultado: UsuarioSeed[] = []
  for (const def of defs) {
    const { data, error } = await sb.auth.admin.createUser({
      email: def.email,
      password: def.password,
      email_confirm: true,
      user_metadata: { nombre_completo: def.nombre, rol: def.rol },
    })
    if (error) { console.error(`  ✗ crearUsuario(${def.email}):`, error); process.exit(1) }
    console.log(`  ✓ ${def.rol.padEnd(7)}  ${def.nombre}`)
    resultado.push({ ...def, id: data.user!.id })
  }

  // Espera al trigger handle_new_user para que los profiles existan
  console.log('\n  Esperando trigger de creación de perfiles…')
  await new Promise(r => setTimeout(r, 3000))

  // Upsert directo de profiles para garantizar nombres correctos (no el email)
  const profileRows = resultado.map(u => ({
    id:              u.id!,
    rol:             u.rol,
    nombre_completo: u.nombre,
    activo:          true,
  }))
  const { error: errP } = await sb.from('profiles').upsert(profileRows, { onConflict: 'id' })
  ok('profiles upsert (nombres correctos)', errP)

  return resultado
}

// ── PASO 5: ESTUDIANTES Y VÍNCULOS ───────────────────────────────────────────
async function insertarEstudiantes(usuarios: UsuarioSeed[]) {
  console.log('\n── PASO 5: Estudiantes y vínculos ───────────────────────────────')

  const laura   = usuarios.find(u => u.email.includes('madre1'))!
  const roberto = usuarios.find(u => u.email.includes('padre2'))!
  const maria   = usuarios.find(u => u.email.includes('madre3'))!

  const { data: est, error: errEst } = await sb.from('students').insert([
    { nombre_completo: 'Sebastián Hernández Vargas', nivel: '3.er grado', grupo: '3-2' },
    { nombre_completo: 'Valeria Hernández Vargas',   nivel: '5.º grado',  grupo: '5-1' },
    { nombre_completo: 'Mateo Vargas Solano',         nivel: '3.er grado', grupo: '3-2' },
    { nombre_completo: 'Daniela Solano Brenes',       nivel: '2.º grado',  grupo: '2-1' },
  ]).select('id, nombre_completo, grupo')
  ok('students (4)', errEst)

  const [sebastian, valeria, mateo, daniela] = est!

  const { error: errV } = await sb.from('parent_student').insert([
    { padre_id: laura.id,   estudiante_id: sebastian.id },
    { padre_id: laura.id,   estudiante_id: valeria.id   },
    { padre_id: roberto.id, estudiante_id: mateo.id     },
    { padre_id: maria.id,   estudiante_id: daniela.id   },
  ])
  ok('parent_student (4 vínculos)', errV)

  return { sebastian, valeria, mateo, daniela }
}

// ── PASO 6: HORARIO COMPLETO GRUPO 3-2 ───────────────────────────────────────
async function insertarHorario(bloques: Record<string, string>, idAna: string, idCarlos: string) {
  console.log('\n── PASO 6: Horario grupo 3-2 ────────────────────────────────────')

  type Dia = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'
  const entradas: { dia: Dia; bloque: string; materia: string; docente_id: string; aula: string }[] = [
    // ── Bloque 1 ────
    { dia: 'Lunes',     bloque: '7:00 – 7:40',   materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    { dia: 'Martes',    bloque: '7:00 – 7:40',   materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    { dia: 'Miércoles', bloque: '7:00 – 7:40',   materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    { dia: 'Jueves',    bloque: '7:00 – 7:40',   materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    { dia: 'Viernes',   bloque: '7:00 – 7:40',   materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    // ── Bloque 2 ────
    { dia: 'Lunes',     bloque: '7:40 – 8:20',   materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    { dia: 'Martes',    bloque: '7:40 – 8:20',   materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    { dia: 'Miércoles', bloque: '7:40 – 8:20',   materia: 'Estudios Sociales', docente_id: idCarlos, aula: 'A-3' },
    { dia: 'Jueves',    bloque: '7:40 – 8:20',   materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    { dia: 'Viernes',   bloque: '7:40 – 8:20',   materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    // ── Bloque 3 ────
    { dia: 'Lunes',     bloque: '8:20 – 9:00',   materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    { dia: 'Martes',    bloque: '8:20 – 9:00',   materia: 'Estudios Sociales', docente_id: idCarlos, aula: 'A-3' },
    { dia: 'Miércoles', bloque: '8:20 – 9:00',   materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    { dia: 'Jueves',    bloque: '8:20 – 9:00',   materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    { dia: 'Viernes',   bloque: '8:20 – 9:00',   materia: 'Educación Física',  docente_id: idCarlos, aula: 'Gim' },
    // ── Bloque 5 (post-receso) ────
    { dia: 'Lunes',     bloque: '9:20 – 10:00',  materia: 'Estudios Sociales', docente_id: idCarlos, aula: 'A-3' },
    { dia: 'Martes',    bloque: '9:20 – 10:00',  materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    { dia: 'Miércoles', bloque: '9:20 – 10:00',  materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    { dia: 'Jueves',    bloque: '9:20 – 10:00',  materia: 'Artes Plásticas',   docente_id: idCarlos, aula: 'Art' },
    { dia: 'Viernes',   bloque: '9:20 – 10:00',  materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    // ── Bloque 6 ────
    { dia: 'Lunes',     bloque: '10:00 – 10:40', materia: 'Educación Física',  docente_id: idCarlos, aula: 'Gim' },
    { dia: 'Martes',    bloque: '10:00 – 10:40', materia: 'Artes Plásticas',   docente_id: idCarlos, aula: 'Art' },
    { dia: 'Miércoles', bloque: '10:00 – 10:40', materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    { dia: 'Jueves',    bloque: '10:00 – 10:40', materia: 'Estudios Sociales', docente_id: idCarlos, aula: 'A-3' },
    { dia: 'Viernes',   bloque: '10:00 – 10:40', materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    // ── Bloque 8 (post-almuerzo) ────
    { dia: 'Lunes',     bloque: '11:30 – 12:10', materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    { dia: 'Martes',    bloque: '11:30 – 12:10', materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    { dia: 'Miércoles', bloque: '11:30 – 12:10', materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    { dia: 'Jueves',    bloque: '11:30 – 12:10', materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    { dia: 'Viernes',   bloque: '11:30 – 12:10', materia: 'Estudios Sociales', docente_id: idCarlos, aula: 'A-3' },
    // ── Bloque 9 ────
    { dia: 'Lunes',     bloque: '12:10 – 12:50', materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    { dia: 'Martes',    bloque: '12:10 – 12:50', materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    { dia: 'Miércoles', bloque: '12:10 – 12:50', materia: 'Estudios Sociales', docente_id: idCarlos, aula: 'A-3' },
    { dia: 'Jueves',    bloque: '12:10 – 12:50', materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    { dia: 'Viernes',   bloque: '12:10 – 12:50', materia: 'Artes Plásticas',   docente_id: idCarlos, aula: 'Art' },
    // ── Bloque 10 ────
    { dia: 'Lunes',     bloque: '12:50 – 1:30',  materia: 'Artes Plásticas',   docente_id: idCarlos, aula: 'Art' },
    { dia: 'Martes',    bloque: '12:50 – 1:30',  materia: 'Educación Física',  docente_id: idCarlos, aula: 'Gim' },
    { dia: 'Miércoles', bloque: '12:50 – 1:30',  materia: 'Español',           docente_id: idAna,    aula: 'A-3' },
    { dia: 'Jueves',    bloque: '12:50 – 1:30',  materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
    { dia: 'Viernes',   bloque: '12:50 – 1:30',  materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    // ── Bloque 11 ────
    { dia: 'Lunes',     bloque: '1:30 – 2:20',   materia: 'Ciencias',          docente_id: idCarlos, aula: 'Lab' },
    { dia: 'Martes',    bloque: '1:30 – 2:20',   materia: 'Estudios Sociales', docente_id: idCarlos, aula: 'A-3' },
    { dia: 'Miércoles', bloque: '1:30 – 2:20',   materia: 'Educación Física',  docente_id: idCarlos, aula: 'Gim' },
    { dia: 'Jueves',    bloque: '1:30 – 2:20',   materia: 'Artes Plásticas',   docente_id: idCarlos, aula: 'Art' },
    { dia: 'Viernes',   bloque: '1:30 – 2:20',   materia: 'Matemáticas',       docente_id: idAna,    aula: 'A-3' },
  ]

  const { error } = await sb.from('schedule_entries').insert(
    entradas.map(e => ({ grupo: '3-2', dia: e.dia, bloque_id: bloques[e.bloque], materia: e.materia, docente_id: e.docente_id, aula: e.aula }))
  )
  ok(`schedule_entries (${entradas.length})`, error)
}

// ── PASO 7: DISPONIBILIDAD DOCENTES ──────────────────────────────────────────
async function insertarDisponibilidad(bloques: Record<string, string>, idAna: string, idCarlos: string) {
  console.log('\n── PASO 7: Disponibilidad docentes ──────────────────────────────')
  type Dia = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'
  const diasAll: Dia[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const bloquesLectivos = [
    '7:00 – 7:40','7:40 – 8:20','8:20 – 9:00',
    '9:20 – 10:00','10:00 – 10:40',
    '11:30 – 12:10','12:10 – 12:50','12:50 – 1:30','1:30 – 2:20',
  ]
  const filas = []
  for (const docId of [idAna, idCarlos]) {
    for (const dia of diasAll) {
      for (const etiq of bloquesLectivos) {
        filas.push({ funcionario_id: docId, dia, bloque_id: bloques[etiq], disponible: true })
      }
    }
  }
  const { error } = await sb.from('staff_availability').insert(filas)
  ok(`staff_availability (${filas.length})`, error)
}

// ── PASO 8: PUBLICACIONES ─────────────────────────────────────────────────────
async function insertarPublicaciones(u: UsuarioSeed[]) {
  console.log('\n── PASO 8: Publicaciones ────────────────────────────────────────')
  const directora  = u.find(x => x.email.includes('directora'))!
  const secretaria = u.find(x => x.email.includes('secretaria'))!
  const ana        = u.find(x => x.email.includes('docente1'))!
  const carlos     = u.find(x => x.email.includes('docente2'))!

  const { error } = await sb.from('posts').insert([
    // Comunicado general — todos
    {
      tipo: 'comunicado', titulo: 'Bienvenida al sistema de gestión escolar',
      contenido: 'Estimadas familias: les damos la bienvenida a la plataforma digital de la Escuela Villas de Ayarco. Aquí pueden consultar horarios, agendar citas con docentes y mantenerse al tanto de todas las actividades y comunicados. Ante cualquier duda, llame al 2272-4746.',
      segmento: 'todos', segmento_valor: null, autor_id: directora.id,
    },
    // Evento — nivel 3.er grado
    {
      tipo: 'evento', titulo: 'Reunión de padres — Tercer grado',
      contenido: 'Se convoca a todos los padres y madres de familia de tercer grado a la reunión informativa del segundo semestre. Se hablará del avance académico, actividades de cierre y el proceso de matrícula.',
      fecha_evento: fecha(dias(7)), hora_evento: '17:30:00', lugar: 'Salón multiusos',
      segmento: 'nivel', segmento_valor: '3.er grado', autor_id: directora.id,
    },
    // Actividad — grupo 3-2
    {
      tipo: 'actividad', titulo: 'Proyecto Ciencias — Maqueta del sistema solar',
      contenido: 'Elaborar una maqueta del sistema solar con materiales reciclados. Se evaluará creatividad, exactitud científica y presentación oral ante el grupo el día de entrega.',
      fecha_asignacion: fecha(new Date()), fecha_limite: fecha(dias(14)),
      segmento: 'grupo', segmento_valor: '3-2', autor_id: carlos.id,
    },
    // Comunicado — todos
    {
      tipo: 'comunicado', titulo: 'Suspensión de lecciones — Feriado',
      contenido: 'Se comunica que el próximo lunes no habrá lecciones por motivo de feriado nacional. Las actividades se reanudan normalmente el martes siguiente.',
      segmento: 'todos', segmento_valor: null, autor_id: secretaria.id,
    },
    // Actividad — grupo 3-2
    {
      tipo: 'actividad', titulo: 'Lectura comprensiva — Capítulo 4 de Español',
      contenido: 'Leer el capítulo 4 del libro de texto y completar el cuestionario de comprensión lectora entregado en clase. Se revisará el miércoles en la primera lección.',
      fecha_asignacion: fecha(new Date()), fecha_limite: fecha(dias(5)),
      segmento: 'grupo', segmento_valor: '3-2', autor_id: ana.id,
    },
    // Comunicado — nivel 2.º grado
    {
      tipo: 'comunicado', titulo: 'Cambio de aula — Segundo grado',
      contenido: 'A partir de la próxima semana, los grupos de segundo grado tendrán sus lecciones en el ala norte del edificio mientras se realizan trabajos de mantenimiento en su aula habitual.',
      segmento: 'nivel', segmento_valor: '2.º grado', autor_id: secretaria.id,
    },
    // Evento — todos
    {
      tipo: 'evento', titulo: 'Feria de Ciencias 2026',
      contenido: 'Todos los grupos participarán en la Feria de Ciencias institucional. Los estudiantes presentarán sus proyectos al público general. Se invita a las familias a visitar los stands.',
      fecha_evento: fecha(dias(11)), hora_evento: '08:00:00', lugar: 'Cancha de la escuela',
      segmento: 'todos', segmento_valor: null, autor_id: directora.id,
    },
  ])
  ok('posts (7)', error)
}

// ── PASO 9: CITAS DE EJEMPLO ──────────────────────────────────────────────────
async function insertarCitas(bloques: Record<string, string>, u: UsuarioSeed[]) {
  console.log('\n── PASO 9: Citas de ejemplo ─────────────────────────────────────')
  const laura   = u.find(x => x.email.includes('madre1'))!
  const roberto = u.find(x => x.email.includes('padre2'))!
  const maria   = u.find(x => x.email.includes('madre3'))!
  const ana     = u.find(x => x.email.includes('docente1'))!
  const carlos  = u.find(x => x.email.includes('docente2'))!

  const { error } = await sb.from('appointments').insert([
    // Pendiente — Laura pide cita con Ana
    {
      padre_id: laura.id, funcionario_id: ana.id,
      fecha: fecha(dias(3)), bloque_id: bloques['9:20 – 10:00'],
      motivo: 'Consultar sobre el rendimiento de Sebastián en Matemáticas durante las últimas semanas y cómo puedo apoyarlo desde casa.',
      estado: 'Pendiente',
    },
    // Confirmada — Roberto con Carlos
    {
      padre_id: roberto.id, funcionario_id: carlos.id,
      fecha: fecha(dias(5)), bloque_id: bloques['10:00 – 10:40'],
      motivo: 'Hablar sobre el proyecto de Ciencias y las estrategias para apoyar a Mateo en casa con los materiales.',
      estado: 'Confirmada',
    },
    // Completada — María con Ana
    {
      padre_id: maria.id, funcionario_id: ana.id,
      fecha: fecha(dias(-3)), bloque_id: bloques['11:30 – 12:10'],
      motivo: 'Consulta sobre la adaptación de Daniela al nuevo año escolar y su integración con el grupo.',
      estado: 'Completada',
    },
    // Rechazada — Laura con Carlos
    {
      padre_id: laura.id, funcionario_id: carlos.id,
      fecha: fecha(dias(-1)), bloque_id: bloques['12:10 – 12:50'],
      motivo: 'Preguntar sobre la calificación del proyecto de Estudios Sociales del primer trimestre.',
      estado: 'Rechazada',
      motivo_rechazo: 'El docente estará en capacitación ese día. Por favor seleccione otra fecha disponible.',
    },
  ])
  ok('appointments (4)', error)
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  RESEED COMPLETO — Plataforma Escolar Villas de Ayarco')
  console.log('  ADVERTENCIA: elimina TODOS los datos existentes')
  console.log('═══════════════════════════════════════════════════════════════')

  await limpiar()
  await insertarInstitucion()
  const bloques  = await insertarTimeBlocks()
  const usuarios = await crearUsuarios()

  const ana    = usuarios.find(u => u.email.includes('docente1'))!
  const carlos = usuarios.find(u => u.email.includes('docente2'))!

  await insertarEstudiantes(usuarios)
  await insertarHorario(bloques, ana.id!, carlos.id!)
  await insertarDisponibilidad(bloques, ana.id!, carlos.id!)
  await insertarPublicaciones(usuarios)
  await insertarCitas(bloques, usuarios)

  // ── Resumen de credenciales ───────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  ✓  RESEED COMPLETADO EXITOSAMENTE')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('\nCredenciales de acceso (GUARDAR ESTA INFORMACIÓN):\n')
  console.log('  ROL       NOMBRE                              CORREO                                          CONTRASEÑA')
  console.log('  ─────────────────────────────────────────────────────────────────────────────────────────────────────────')
  for (const u of usuarios) {
    const rol  = u.rol.padEnd(7)
    const nom  = u.nombre.padEnd(38)
    const mail = u.email.padEnd(47)
    console.log(`  ${rol} ${nom} ${mail} ${u.password}`)
  }
  console.log()
}

main().catch(err => { console.error('\n✗ ERROR FATAL:', err); process.exit(1) })
