# CLAUDE.md — Plataforma Web de Gestión Escolar para Padres de Familia

Contexto del proyecto para Claude Code. Leer completo antes de generar código.

## 1. Resumen del proyecto

Plataforma web para la **Escuela Villas de Ayarco** (Costa Rica) que centraliza información académica y administrativa para padres de familia: horarios, citas con docentes, actividades/eventos/comunicados y un chatbot con IA. Proyecto académico (TEC, TI-2800), ejecución 100% remota, **presupuesto ₡0** — solo herramientas en planes gratuitos.

- **Frontend/Backend:** Next.js (App Router, API routes)
- **Base de datos y Auth:** Supabase (Postgres + Supabase Auth, bcrypt)
- **Despliegue:** Vercel (HTTPS obligatorio)
- **Idioma de toda la UI y mensajes:** español (Costa Rica)

## 2. Roles del sistema

| Rol | Permisos |
|---|---|
| `padre` | Ve SOLO la información de sus hijos vinculados; agenda citas; usa el chatbot |
| `docente` | Configura su disponibilidad de citas, atiende solicitudes, publica actividades para sus grupos |
| `admin` | Gestión total: usuarios, vinculación padre-estudiante, horarios, publicaciones, citas |

Regla crítica: el control de acceso se valida **del lado del servidor** (RLS en Supabase + validación en API routes). Un padre nunca debe poder acceder a datos de estudiantes no vinculados ni a rutas de admin, ni siquiera por URL directa.

## 3. Módulos (alcance incluido)

1. **Página pública institucional (SC-01, cambio aprobado 16/04/2026):** página SIN autenticación con datos generales de la escuela — contacto, información administrativa, avisos relevantes. Es la única sección pública además de login y recuperación de contraseña.
2. **Autenticación y usuarios:** login correo+contraseña; sesión expira a las **8 horas de inactividad**; recuperación de contraseña por enlace de correo con validez de **30 minutos** (al restablecer, la sesión anterior se invalida); los padres NO se autorregistran — los crea el admin y los vincula con uno o más estudiantes.
3. **Horarios:** vista semanal (lunes–viernes) por estudiante con materia, docente, aula y bloque horario. Gestión exclusiva del admin (CRUD). Mostrar fecha/hora de última actualización. Si no hay horario: mensaje informativo claro, nunca pantalla de error. Sin generación automática de horarios.
4. **Citas:** padre selecciona funcionario → fecha → bloque disponible → motivo (máx. 300 caracteres). Estados: `Pendiente → Confirmada | Rechazada (con motivo opcional) | Cancelada | Completada`. Una cita `Completada` es inmutable. Reglas anti-conflicto: (a) un bloque con cita activa se deshabilita en el calendario; (b) un padre no puede tener más de una cita activa con el mismo funcionario en la misma fecha; (c) si la cita previa fue Cancelada/Rechazada, se permite agendar de nuevo. Al cancelar, el bloque se libera. Docentes configuran disponibilidad por días y bloques, y pueden bloquear bloques manualmente.
5. **Publicaciones (actividades, eventos, comunicados):** tres tipos — actividad extraclase (descripción, fecha de asignación, fecha límite), evento (título, descripción, fecha, hora, lugar), comunicado (título, contenido). Segmentación: toda la institución, un nivel, o un grupo. El padre ve SOLO lo de los grupos/niveles de sus hijos, orden cronológico descendente, filtros por tipo y fecha. Edición/eliminación registra fecha de modificación.
6. **Chatbot con IA:** responde consultas frecuentes en lenguaje natural usando ÚNICAMENTE información de la plataforma (horarios, publicaciones, FAQ institucional almacenada). Si la consulta excede su alcance, debe decirlo y sugerir contactar al personal. Sin acceso a fuentes externas. Guardar registros de conversaciones en tabla `chatbot_logs`.
7. **Panel de administración:** gestión de usuarios y vínculos padre-estudiante (incluye desactivar/reactivar cuentas sin borrar historial), horarios, publicaciones, citas y disponibilidad.
8. **Notificaciones por correo:** al crear, confirmar, rechazar o cancelar una cita se notifica a ambas partes con datos suficientes (nombre, fecha, bloque, motivo). Usar Resend (plan gratuito) o equivalente gratuito; los correos de auth los maneja Supabase.

## 4. Alcance EXCLUIDO (no implementar nunca)

- Apps móviles nativas (solo web responsiva)
- Integración con sistemas externos de la escuela
- Pagos, finanzas, mensualidades
- Calificaciones, asistencia, boletines
- Chat/mensajería en tiempo real, notificaciones push
- Generación automática de horarios
- Multi-institución (es solo para Villas de Ayarco)

## 5. Modelo de datos (entidades mínimas)

- `profiles` (extiende auth.users): rol, nombre, activo
- `students`: nombre, nivel, grupo
- `parent_student` (N:M)
- `schedule_entries`: grupo, día, bloque, materia, docente_id, aula, updated_at
- `time_blocks`: definición institucional de bloques horarios
- `staff_availability`: funcionario, día, bloque, disponible/bloqueado
- `appointments`: padre_id, funcionario_id, fecha, bloque, motivo (≤300), estado, motivo_rechazo, timestamps
- `posts`: tipo (actividad|evento|comunicado), campos por tipo, segmento (todos|nivel|grupo), autor, updated_at
- `chatbot_logs`
- `institution_info`: contenido de la página pública (editable por admin)

Aplicar Row Level Security en TODAS las tablas desde la primera migración.

## 6. Requerimientos no funcionales (verificables)

- Compatible con Chrome, Firefox, Edge y Safari, escritorio y móvil (diseño responsivo; menú lateral en desktop, desplegable en móvil, sección activa indicada)
- Respuesta < 3 s en operaciones regulares, < 5 s en complejas
- HTTPS en todas las rutas (Vercel lo provee)
- Contraseñas: solo Supabase Auth (bcrypt); jamás texto plano ni manejo manual
- Validación de entradas del lado del servidor en todos los formularios (anti SQL injection y XSS); usar queries parametrizadas del cliente de Supabase y sanitizar texto libre
- Mensajes de error claros, en español, sin exponer detalles técnicos (nunca stack traces ni códigos internos al usuario)
- Código modular y documentado (RNF-10): comentarios de propósito/entradas/salidas por módulo
- UI intuitiva para usuarios con baja experiencia digital: textos simples, botones grandes, confirmaciones antes de acciones destructivas

## 7. Convenciones de desarrollo

- TypeScript estricto
- Estructura: `app/(public)` para página institucional y login; `app/(padre)`, `app/(docente)`, `app/(admin)` protegidas por middleware según rol
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo server), `RESEND_API_KEY`, `LLM_API_KEY`
- Migraciones SQL versionadas en `/supabase/migrations`
- Commits descriptivos en español; ramas por módulo; PRs revisadas entre John y Brandon
- Seed script con datos de demostración realistas (1 admin, 2 docentes, 3 padres, 4 estudiantes, horario completo de un grupo, 5 publicaciones, 3 citas en distintos estados)

## 8. Plan de ejecución (sprint de 3 días)

**Día 1 — Fundación:** scaffold Next.js + Supabase, esquema completo con RLS, auth (login, recuperación, expiración 8h), middleware de roles, layout responsivo, página pública institucional (SC-01), primer deploy a Vercel.

**Día 2 — Módulos core:** horarios (CRUD admin + vista padre + selector multi-hijo + mensaje sin horario), citas (flujo completo, estados, reglas anti-duplicado, disponibilidad docente), publicaciones (3 tipos, segmentación, filtros), panel admin (usuarios y vínculos).

**Día 3 — Cierre:** chatbot (API route con contexto de Supabase), notificaciones de citas con Resend, seed data, pruebas de flujos en los 4 navegadores, correcciones, README y documentación de variables de entorno, deploy final.

Prioridad estricta MoSCoW: si el tiempo aprieta, se sacrifican primero RF-19/RF-20 extras de UX (Could Have), nunca los Must Have (RF-01 a RF-13).

## 9. Datos institucionales verificados

**Regla de confiabilidad de fuentes:** los nombres de personas que aparecen en el PDF del Avance 1 son la autoridad; las páginas web (DRE Cartago, Facebook) están desactualizadas. Ante conflicto, gana el PDF. Ejemplo real: la DRE lista a otra directora; la correcta es la del PDF.

| Dato | Valor | Fuente |
|---|---|---|
| Nombre | Escuela Villas de Ayarco, La Unión de Cartago | Escudo / DRE |
| Dirección | 400 m al sur del Supermercado Pasoca, Villas de Ayarco, San Juan, La Unión, Cartago | DRE Cartago |
| Teléfono | 2272-4746 | DRE Cartago |
| Correo | esc.villasdeayarco@mep.go.cr | DRE Cartago |
| Jornada | Lunes a viernes, 7:00 a. m. – 2:20 p. m. (ampliada desde 2020) | DRE Cartago |
| Directora | M.A.Ed. **Kimberly Bonilla Noguera** | **PDF (autoridad)** |
| Secretaria | Josseline Ilama Navarro | PDF |
| Circuito | 06, Dirección Regional de Educación de Cartago | DRE Cartago |
| Fundación | 1991 según el escudo; apertura aprobada en 1990 según DRE. `TODO:` confirmar | Escudo / DRE |
| Población | ~662 estudiantes | DRE Cartago |
| Servicios de apoyo | Terapia del lenguaje, terapia emocional, apoyo al aprendizaje, aula integrada, orientación | DRE Cartago |
| Colores | Verde (laurel/árbol del escudo) + amarillo (banner) sobre fondo claro | Escudo |
| Logo | `TODO:` solicitar archivo del escudo en buena resolución; mientras tanto usar el placeholder "VA" del mockup | — |

## 10. FAQ semilla del chatbot (supuestas — validar con secretaría)

Cargar estas preguntas/respuestas como contenido inicial del chatbot y de la página pública. Son típicas de una escuela pública del MEP; marcar todas como `validada: false` en la tabla hasta confirmación:
horario de atención · cómo agendar cita con docente · justificación de ausencias (3 días hábiles, por escrito) · fechas y documentos de matrícula (constancia de nacimiento, vacunas, comprobante de domicilio) · uniforme oficial del MEP · servicios de apoyo disponibles · recuperación de contraseña · contacto con dirección. El texto completo de cada Q&A está en el bloque `CONFIG.faq` del mockup.

## 11. Mockup de referencia (fuente de verdad visual)

El archivo `mockup-plataforma-villas-ayarco.html` (raíz del repo) define el diseño aprobado: paleta derivada del escudo (variables CSS `--verde-*`, `--amarillo`), tipografías **Bricolage Grotesque** (display) y **Atkinson Hyperlegible** (cuerpo, elegida por legibilidad para usuarios con poca experiencia digital), y 7 vistas: página pública con tablón de avisos, login, horario semanal tipo tabla, citas (formulario + historial con chips de estado), publicaciones con filtros, chatbot y panel admin.

Reglas al implementar:
- Replicar fielmente la estética del mockup (colores, tipografías, chips de estado, tablón de avisos con "pin").
- TODO el contenido institucional vive en datos (tabla `institution_info`, seeds), nunca hardcodeado en componentes — el mockup ya modela esto con su bloque `CONFIG`: respetar esa separación para que la información real se inserte sin tocar código de UI.
- Los elementos marcados `TODO` en el `CONFIG` del mockup (bloques horarios, lista de docentes, avisos reales, FAQ validada) llegarán durante el proceso; el código debe funcionar con placeholders y aceptar el reemplazo solo editando datos.
