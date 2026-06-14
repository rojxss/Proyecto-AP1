-- Tabla para solicitudes de acceso enviadas desde la página pública.
-- Un padre o tutor completa el formulario; el admin aprueba o rechaza.
-- Al aprobar se crea la cuenta en Supabase Auth y se envía correo de bienvenida.

CREATE TABLE IF NOT EXISTS access_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_completo TEXT        NOT NULL,
  correo          TEXT        NOT NULL,
  telefono        TEXT,
  info_adicional  TEXT,
  estado          TEXT        NOT NULL DEFAULT 'pendiente'
                              CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  procesado_en    TIMESTAMPTZ,
  notas_admin     TEXT
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Cualquier visitante puede enviar una solicitud (sin cuenta)
CREATE POLICY "access_requests_insert_public" ON access_requests
  FOR INSERT WITH CHECK (true);

-- Solo el admin puede leer, actualizar y eliminar solicitudes
CREATE POLICY "access_requests_admin_all" ON access_requests
  FOR ALL USING (get_my_rol() = 'admin');
