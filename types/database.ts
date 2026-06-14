/**
 * Tipos TypeScript para el modelo de datos de Supabase.
 * Refleja exactamente las tablas de la migración inicial.
 */

export type Rol = 'padre' | 'docente' | 'admin'
export type EstadoCita = 'Pendiente' | 'Confirmada' | 'Rechazada' | 'Cancelada' | 'Completada'
export type TipoPost = 'actividad' | 'evento' | 'comunicado'
export type SegmentoPost = 'todos' | 'nivel' | 'grupo'
export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'

// ─── Tablas principales ───────────────────────────────────────────────────────

export interface Profile {
  id: string              // FK → auth.users.id
  rol: Rol
  nombre_completo: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  nombre_completo: string
  nivel: string           // "3.º grado"
  grupo: string           // "3-2"
  activo: boolean
  created_at: string
}

export interface ParentStudent {
  padre_id: string        // FK → profiles.id
  estudiante_id: string   // FK → students.id
}

export interface TimeBlock {
  id: string
  etiqueta: string        // "7:00 – 7:40"
  orden: number           // para ordenar en la tabla
  es_receso: boolean
  es_almuerzo: boolean
}

export interface ScheduleEntry {
  id: string
  grupo: string           // "3-2"
  dia: DiaSemana
  bloque_id: string       // FK → time_blocks.id
  materia: string
  docente_id: string | null  // FK → profiles.id
  aula: string
  updated_at: string
}

export interface StaffAvailability {
  id: string
  funcionario_id: string  // FK → profiles.id
  dia: DiaSemana
  bloque_id: string       // FK → time_blocks.id
  disponible: boolean     // false = bloqueado manualmente
}

export interface Appointment {
  id: string
  padre_id: string        // FK → profiles.id
  funcionario_id: string  // FK → profiles.id
  fecha: string           // ISO date "YYYY-MM-DD"
  bloque_id: string       // FK → time_blocks.id
  motivo: string          // máx. 300 caracteres
  estado: EstadoCita
  motivo_rechazo: string | null
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  tipo: TipoPost
  titulo: string
  contenido: string | null
  // Actividad
  fecha_asignacion: string | null
  fecha_limite: string | null
  // Evento
  fecha_evento: string | null
  hora_evento: string | null
  lugar: string | null
  // Segmentación
  segmento: SegmentoPost
  segmento_valor: string | null   // nivel o grupo específico
  autor_id: string                // FK → profiles.id
  created_at: string
  updated_at: string
}

export interface ChatbotLog {
  id: string
  padre_id: string        // FK → profiles.id
  consulta: string
  respuesta: string
  proveedor: string       // "gemini" | "groq" | "mock"
  created_at: string
}

export interface InstitutionInfo {
  id: string
  clave: string           // "nombre", "telefono", "aviso_1", "faq_1", etc.
  valor: string
  tipo: 'texto' | 'aviso' | 'faq' | 'servicio'
  orden: number
  validado: boolean       // false = supuesto, pendiente confirmación institución
  updated_at: string
}

// ─── Tipos compuestos para joins frecuentes ────────────────────────────────

export interface AppointmentConDetalles extends Appointment {
  funcionario: Pick<Profile, 'nombre_completo'>
  bloque: Pick<TimeBlock, 'etiqueta'>
}

export interface ScheduleEntryConDetalles extends ScheduleEntry {
  bloque: TimeBlock
  docente: Pick<Profile, 'nombre_completo'> | null
}
