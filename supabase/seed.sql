-- ============================================================
-- Seed — Datos de demostración realistas
-- EJECUTAR DESPUÉS de la migración 001.
-- Los usuarios de auth deben crearse manualmente en el dashboard
-- de Supabase o via la API de admin (ver README).
-- ============================================================

-- ─── BLOQUES HORARIOS ─────────────────────────────────────────────────────────
-- TODO: confirmar bloques oficiales con la institución (jornada 7:00 – 2:20)

INSERT INTO time_blocks (etiqueta, orden, es_receso, es_almuerzo) VALUES
  ('7:00 – 7:40',   1,  false, false),
  ('7:40 – 8:20',   2,  false, false),
  ('8:20 – 9:00',   3,  false, false),
  ('9:00 – 9:20',   4,  true,  false),  -- Receso
  ('9:20 – 10:00',  5,  false, false),
  ('10:00 – 10:40', 6,  false, false),
  ('10:40 – 11:30', 7,  false, true),   -- Almuerzo
  ('11:30 – 12:10', 8,  false, false),
  ('12:10 – 12:50', 9,  false, false),
  ('1:00 – 1:40',   10, false, false),
  ('1:40 – 2:20',   11, false, false);

-- ─── INSTITUTION_INFO — Datos verificados de la institución ──────────────────
-- Los campos marcados validado=false son supuestos; confirmar con secretaría.

INSERT INTO institution_info (clave, valor, tipo, orden, validado) VALUES
  ('nombre',          'Escuela Villas de Ayarco',                                                           'texto',   1,  true),
  ('lugar',           'La Unión de Cartago',                                                                'texto',   2,  true),
  ('fundacion',       '1991',                                                                               'texto',   3,  false), -- TODO: confirmar (escudo dice 1991, DRE dice apertura aprobada 1990)
  ('lema',            'Un solo lugar para toda la información escolar de sus hijos: horarios, citas, actividades y comunicados.', 'texto', 4, true),
  ('direccion',       '400 metros al sur del Supermercado Pasoca, Villas de Ayarco, San Juan, La Unión, Cartago', 'texto', 5, true),
  ('telefono',        '2272-4746',                                                                          'texto',   6,  true),
  ('correo',          'esc.villasdeayarco@mep.go.cr',                                                       'texto',   7,  true),
  ('horario_atencion','Lunes a viernes, 7:00 a. m. – 2:20 p. m.',                                          'texto',   8,  true),
  ('directora',       'M.A.Ed. Kimberly Bonilla Noguera',                                                  'texto',   9,  true),  -- Fuente: PDF Avance 1 (autoridad)
  ('secretaria',      'Josseline Ilama Navarro',                                                           'texto',   10, true),  -- Fuente: PDF
  ('circuito',        'Circuito 06, Dirección Regional de Educación de Cartago',                           'texto',   11, true),
  ('resena',          'La Escuela Villas de Ayarco nació del esfuerzo de la propia comunidad: un grupo de vecinos gestionó su apertura para que los niños del barrio no tuvieran que trasladarse a otras instituciones. Aprobada su creación en 1990, hoy es catalogada como una escuela de excelencia, con jornada ampliada y una población de más de 600 estudiantes.', 'texto', 12, true);

-- Servicios de apoyo
INSERT INTO institution_info (clave, valor, tipo, orden, validado) VALUES
  ('servicio_1', 'Terapia del lenguaje',    'servicio', 1, true),
  ('servicio_2', 'Terapia emocional',       'servicio', 2, true),
  ('servicio_3', 'Apoyo al aprendizaje',    'servicio', 3, true),
  ('servicio_4', 'Aula integrada',          'servicio', 4, true),
  ('servicio_5', 'Orientación',             'servicio', 5, true);

-- Avisos públicos (formato: FECHA|||TITULO|||TEXTO)
-- TODO: reemplazar por avisos reales de la dirección
INSERT INTO institution_info (clave, valor, tipo, orden, validado) VALUES
  ('aviso_1', '09 jun 2026|||Matrícula curso 2027|||El periodo de prematrícula para el curso lectivo 2027 inicia en julio. Detalles en secretaría.',                       'aviso', 1, false),
  ('aviso_2', '05 jun 2026|||Acto cívico|||Celebración del Día del Árbol el lunes 15 de junio a las 8:00 a. m. en el gimnasio.',                                          'aviso', 2, false),
  ('aviso_3', '01 jun 2026|||Nueva plataforma para padres|||La escuela estrena este sitio para consultar horarios, agendar citas y recibir comunicados.',                  'aviso', 3, false);

-- FAQ institucional (formato: PREGUNTA|||RESPUESTA)
-- TODO: validar con secretaría antes de marcar validado=true
INSERT INTO institution_info (clave, valor, tipo, orden, validado) VALUES
  ('faq_1', '¿Cuál es el horario de atención de la escuela?|||La jornada es de lunes a viernes, de 7:00 a. m. a 2:20 p. m. La secretaría atiende dentro de ese horario.', 'faq', 1, false),
  ('faq_2', '¿Cómo agendo una cita con la maestra de mi hijo?|||Desde la sección Citas de esta plataforma: elija al docente, un bloque disponible y escriba el motivo. Recibirá la confirmación por correo.', 'faq', 2, false),
  ('faq_3', '¿Cómo justifico una ausencia de mi hijo?|||Debe presentar la justificación por escrito a la docente guía dentro de los tres días hábiles siguientes, o entregarla en secretaría.', 'faq', 3, false),
  ('faq_4', '¿Cuándo es la matrícula y qué documentos necesito?|||Las fechas se publican en los comunicados de esta plataforma. Generalmente se solicita constancia de nacimiento, hoja de vacunas al día y comprobante de domicilio.', 'faq', 4, false),
  ('faq_5', '¿Cuál es el uniforme oficial?|||El uniforme oficial del MEP: camisa celeste, pantalón o enagua azul y zapatos negros. Para Educación Física, el uniforme deportivo de la institución.', 'faq', 5, false),
  ('faq_6', '¿La escuela ofrece servicios de apoyo?|||Sí: terapia del lenguaje, terapia emocional, apoyo al aprendizaje, aula integrada y orientación. Consulte con la docente guía para una referencia.', 'faq', 6, false),
  ('faq_7', 'Olvidé mi contraseña, ¿qué hago?|||En la pantalla de inicio de sesión use «¿Olvidó su contraseña?». Recibirá un enlace por correo válido por 30 minutos.', 'faq', 7, false),
  ('faq_8', '¿Cómo me comunico con la dirección?|||Al teléfono 2272-4746 o al correo esc.villasdeayarco@mep.go.cr, en horario de oficina.', 'faq', 8, false);

-- ─── NOTA: Usuarios de demostración ─────────────────────────────────────────
-- Los usuarios de Supabase Auth NO se pueden crear con SQL directo por seguridad.
-- Instrucciones para crear los usuarios demo en README.md:
--
-- Crear via Supabase Dashboard → Authentication → Users → Add user:
--
-- admin@villasdeayarco.demo  / Demo1234!  (nombre: "Kimberly Bonilla Noguera", rol: admin)
-- docente1@villasdeayarco.demo / Demo1234! (nombre: "Prof. Laura Vargas Mora", rol: docente)
-- docente2@villasdeayarco.demo / Demo1234! (nombre: "Prof. Andrés Núñez Salazar", rol: docente)
-- padre1@villasdeayarco.demo / Demo1234!  (nombre: "María Rodríguez Solano", rol: padre)
-- padre2@villasdeayarco.demo / Demo1234!  (nombre: "Carlos Mora Jiménez", rol: padre)
-- padre3@villasdeayarco.demo / Demo1234!  (nombre: "Ana Pérez Segura", rol: padre)
--
-- El trigger handle_new_user() crea el perfil automáticamente si se pasa
-- raw_user_meta_data: { "rol": "admin", "nombre_completo": "Kimberly Bonilla Noguera" }

-- ─── ESTUDIANTES demo ────────────────────────────────────────────────────────
-- Se deben insertar DESPUÉS de crear los usuarios en auth (para tener los UUIDs)
-- y luego crear los vínculos en parent_student.
-- Ver README para el script SQL de vinculación con los UUIDs reales.

INSERT INTO students (nombre_completo, nivel, grupo) VALUES
  ('Daniel Rodríguez Solano', '3.º grado', '3-2'),
  ('Sofía Rodríguez Solano',  '5.º grado', '5-1'),
  ('Miguel Mora Jiménez',     '4.º grado', '4-1'),
  ('Valeria Pérez Segura',    '2.º grado', '2-3');

-- ─── HORARIO DEMO — grupo 3-2 ────────────────────────────────────────────────
-- Se insertará via script separado (seed_horario.sql) después de tener los UUIDs
-- de docentes creados. Ver README.

-- ─── PUBLICACIONES demo ──────────────────────────────────────────────────────
-- Se insertan después de tener el UUID del admin. Ver README seed instructions.
