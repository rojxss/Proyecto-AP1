-- ============================================================
-- Migración 001 — Esquema inicial completo con RLS activado
-- Proyecto: Plataforma Escuela Villas de Ayarco
-- Fecha: 2026-06-12
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TIPOS ENUMERADOS ────────────────────────────────────────────────────────

CREATE TYPE rol_usuario AS ENUM ('padre', 'docente', 'admin');
CREATE TYPE estado_cita AS ENUM ('Pendiente', 'Confirmada', 'Rechazada', 'Cancelada', 'Completada');
CREATE TYPE tipo_post AS ENUM ('actividad', 'evento', 'comunicado');
CREATE TYPE segmento_post AS ENUM ('todos', 'nivel', 'grupo');
CREATE TYPE dia_semana AS ENUM ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes');
CREATE TYPE tipo_info AS ENUM ('texto', 'aviso', 'faq', 'servicio');

-- ─── TABLA: profiles ─────────────────────────────────────────────────────────
-- Extiende auth.users de Supabase con datos de rol y estado.

CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol               rol_usuario NOT NULL,
  nombre_completo   TEXT NOT NULL CHECK (length(trim(nombre_completo)) > 0),
  activo            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ─── TABLA: students ─────────────────────────────────────────────────────────

CREATE TABLE students (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_completo   TEXT NOT NULL CHECK (length(trim(nombre_completo)) > 0),
  nivel             TEXT NOT NULL,   -- "3.º grado"
  grupo             TEXT NOT NULL,   -- "3-2"
  activo            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── TABLA: parent_student (N:M padre ↔ estudiante) ──────────────────────────

CREATE TABLE parent_student (
  padre_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  estudiante_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (padre_id, estudiante_id)
);

-- ─── TABLA: time_blocks ──────────────────────────────────────────────────────
-- Definición institucional de bloques horarios (TODO: confirmar con institución)

CREATE TABLE time_blocks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etiqueta    TEXT NOT NULL UNIQUE,   -- "7:00 – 7:40"
  orden       INTEGER NOT NULL,
  es_receso   BOOLEAN NOT NULL DEFAULT false,
  es_almuerzo BOOLEAN NOT NULL DEFAULT false
);

-- ─── TABLA: schedule_entries ─────────────────────────────────────────────────

CREATE TABLE schedule_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo       TEXT NOT NULL,
  dia         dia_semana NOT NULL,
  bloque_id   UUID NOT NULL REFERENCES time_blocks(id) ON DELETE RESTRICT,
  materia     TEXT NOT NULL,
  docente_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  aula        TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grupo, dia, bloque_id)
);

CREATE TRIGGER schedule_entries_updated_at
  BEFORE UPDATE ON schedule_entries
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ─── TABLA: staff_availability ───────────────────────────────────────────────

CREATE TABLE staff_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dia             dia_semana NOT NULL,
  bloque_id       UUID NOT NULL REFERENCES time_blocks(id) ON DELETE CASCADE,
  disponible      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (funcionario_id, dia, bloque_id)
);

-- ─── TABLA: appointments ─────────────────────────────────────────────────────

CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  padre_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  funcionario_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fecha            DATE NOT NULL,
  bloque_id        UUID NOT NULL REFERENCES time_blocks(id) ON DELETE RESTRICT,
  motivo           TEXT NOT NULL CHECK (
                     length(trim(motivo)) > 0 AND
                     length(motivo) <= 300
                   ),
  estado           estado_cita NOT NULL DEFAULT 'Pendiente',
  motivo_rechazo   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- Índice para buscar citas activas por funcionario/fecha (regla anti-conflicto)
CREATE INDEX idx_appointments_funcionario_fecha
  ON appointments (funcionario_id, fecha, bloque_id)
  WHERE estado IN ('Pendiente', 'Confirmada');

-- Regla: una cita Completada no se puede modificar
CREATE OR REPLACE FUNCTION proteger_cita_completada()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = 'Completada' THEN
    RAISE EXCEPTION 'Una cita completada no puede modificarse.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cita_completada_inmutable
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION proteger_cita_completada();

-- ─── TABLA: posts ────────────────────────────────────────────────────────────

CREATE TABLE posts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo               tipo_post NOT NULL,
  titulo             TEXT NOT NULL CHECK (length(trim(titulo)) > 0),
  contenido          TEXT,
  -- Campos de actividad
  fecha_asignacion   DATE,
  fecha_limite       DATE,
  -- Campos de evento
  fecha_evento       DATE,
  hora_evento        TIME,
  lugar              TEXT,
  -- Segmentación
  segmento           segmento_post NOT NULL DEFAULT 'todos',
  segmento_valor     TEXT,   -- nombre del nivel o grupo, null si segmento='todos'
  autor_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE INDEX idx_posts_segmento ON posts (segmento, segmento_valor);
CREATE INDEX idx_posts_created ON posts (created_at DESC);

-- ─── TABLA: chatbot_logs ─────────────────────────────────────────────────────

CREATE TABLE chatbot_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  padre_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consulta    TEXT NOT NULL,
  respuesta   TEXT NOT NULL,
  proveedor   TEXT NOT NULL DEFAULT 'mock',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── TABLA: institution_info ─────────────────────────────────────────────────
-- Todo el contenido de la página pública vive aquí. Los componentes solo leen datos.

CREATE TABLE institution_info (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave       TEXT NOT NULL UNIQUE,
  valor       TEXT NOT NULL,
  tipo        tipo_info NOT NULL DEFAULT 'texto',
  orden       INTEGER NOT NULL DEFAULT 0,
  validado    BOOLEAN NOT NULL DEFAULT false,  -- false = supuesto, pendiente confirmación
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER institution_info_updated_at
  BEFORE UPDATE ON institution_info
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — activo en TODAS las tablas
-- ============================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student    ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_info  ENABLE ROW LEVEL SECURITY;

-- ─── Función helper: obtener rol del usuario actual ───────────────────────────

CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS rol_usuario AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Función helper: verificar si el padre tiene vínculo con el estudiante ────

CREATE OR REPLACE FUNCTION padre_tiene_acceso_a_estudiante(est_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_student
    WHERE padre_id = auth.uid() AND estudiante_id = est_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── POLÍTICAS: profiles ──────────────────────────────────────────────────────

-- Lectura: cada usuario ve su propio perfil; admin ve todos
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR get_my_rol() = 'admin'
    OR (get_my_rol() IN ('padre', 'docente') AND rol IN ('docente', 'admin'))
    -- padres y docentes necesitan ver nombre de funcionarios para citas
  );

-- Inserción: solo la aplicación (service_role) crea perfiles
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (get_my_rol() = 'admin');

-- Actualización: cada usuario actualiza su propio perfil; admin actualiza todos
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid() OR get_my_rol() = 'admin')
  WITH CHECK (id = auth.uid() OR get_my_rol() = 'admin');

-- ─── POLÍTICAS: students ──────────────────────────────────────────────────────

-- Padre: solo ve sus estudiantes vinculados
CREATE POLICY "students_select_padre" ON students FOR SELECT
  USING (
    padre_tiene_acceso_a_estudiante(id)
    OR get_my_rol() IN ('admin', 'docente')
  );

CREATE POLICY "students_insert_admin" ON students FOR INSERT
  WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "students_update_admin" ON students FOR UPDATE
  USING (get_my_rol() = 'admin');

-- ─── POLÍTICAS: parent_student ────────────────────────────────────────────────

CREATE POLICY "parent_student_select" ON parent_student FOR SELECT
  USING (padre_id = auth.uid() OR get_my_rol() = 'admin');

CREATE POLICY "parent_student_insert_admin" ON parent_student FOR INSERT
  WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "parent_student_delete_admin" ON parent_student FOR DELETE
  USING (get_my_rol() = 'admin');

-- ─── POLÍTICAS: time_blocks ───────────────────────────────────────────────────

-- Lectura pública para usuarios autenticados
CREATE POLICY "time_blocks_select" ON time_blocks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "time_blocks_admin" ON time_blocks FOR ALL
  USING (get_my_rol() = 'admin')
  WITH CHECK (get_my_rol() = 'admin');

-- ─── POLÍTICAS: schedule_entries ─────────────────────────────────────────────

-- Padre: ve horarios de grupos de sus hijos
CREATE POLICY "schedule_entries_select_padre" ON schedule_entries FOR SELECT
  USING (
    get_my_rol() = 'admin'
    OR get_my_rol() = 'docente'
    OR EXISTS (
      SELECT 1 FROM students s
      JOIN parent_student ps ON ps.estudiante_id = s.id
      WHERE ps.padre_id = auth.uid() AND s.grupo = schedule_entries.grupo
    )
  );

CREATE POLICY "schedule_entries_admin" ON schedule_entries FOR ALL
  USING (get_my_rol() = 'admin')
  WITH CHECK (get_my_rol() = 'admin');

-- ─── POLÍTICAS: staff_availability ───────────────────────────────────────────

CREATE POLICY "staff_availability_select" ON staff_availability FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Docente gestiona su propia disponibilidad; admin gestiona todas
CREATE POLICY "staff_availability_write" ON staff_availability FOR ALL
  USING (
    funcionario_id = auth.uid()
    OR get_my_rol() = 'admin'
  )
  WITH CHECK (
    funcionario_id = auth.uid()
    OR get_my_rol() = 'admin'
  );

-- ─── POLÍTICAS: appointments ──────────────────────────────────────────────────

-- Padre: solo sus propias citas
CREATE POLICY "appointments_select_padre" ON appointments FOR SELECT
  USING (
    padre_id = auth.uid()
    OR funcionario_id = auth.uid()
    OR get_my_rol() = 'admin'
  );

CREATE POLICY "appointments_insert_padre" ON appointments FOR INSERT
  WITH CHECK (
    padre_id = auth.uid()
    AND get_my_rol() = 'padre'
  );

-- Padre puede cancelar; funcionario/admin pueden confirmar, rechazar, completar
CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  USING (
    padre_id = auth.uid()
    OR funcionario_id = auth.uid()
    OR get_my_rol() = 'admin'
  );

-- ─── POLÍTICAS: posts ────────────────────────────────────────────────────────

-- Padre: ve publicaciones de 'todos' + su nivel + su grupo
CREATE POLICY "posts_select_padre" ON posts FOR SELECT
  USING (
    get_my_rol() IN ('admin', 'docente')
    OR segmento = 'todos'
    OR EXISTS (
      SELECT 1 FROM students s
      JOIN parent_student ps ON ps.estudiante_id = s.id
      WHERE ps.padre_id = auth.uid()
        AND (
          (segmento = 'nivel' AND s.nivel = posts.segmento_valor)
          OR (segmento = 'grupo' AND s.grupo = posts.segmento_valor)
        )
    )
  );

CREATE POLICY "posts_write_docente_admin" ON posts FOR ALL
  USING (
    autor_id = auth.uid()
    OR get_my_rol() = 'admin'
  )
  WITH CHECK (
    get_my_rol() IN ('docente', 'admin')
  );

-- ─── POLÍTICAS: chatbot_logs ──────────────────────────────────────────────────

CREATE POLICY "chatbot_logs_select" ON chatbot_logs FOR SELECT
  USING (padre_id = auth.uid() OR get_my_rol() = 'admin');

CREATE POLICY "chatbot_logs_insert" ON chatbot_logs FOR INSERT
  WITH CHECK (padre_id = auth.uid() AND get_my_rol() = 'padre');

-- ─── POLÍTICAS: institution_info ─────────────────────────────────────────────

-- Lectura pública (incluye usuarios no autenticados para la página pública SC-01)
CREATE POLICY "institution_info_select_public" ON institution_info FOR SELECT
  USING (true);

CREATE POLICY "institution_info_admin" ON institution_info FOR ALL
  USING (get_my_rol() = 'admin')
  WITH CHECK (get_my_rol() = 'admin');

-- ============================================================
-- Trigger: crear perfil automáticamente al registrar usuario en auth
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, rol, nombre_completo)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'padre'),
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
