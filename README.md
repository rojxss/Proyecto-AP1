# Plataforma Web de Gestión Escolar para Padres de Familia

Plataforma web desarrollada para la **Escuela Villas de Ayarco** con el propósito de centralizar el acceso a información académica y administrativa para los padres de familia, reducir la carga operativa del personal administrativo y mejorar la comunicación entre la institución y las familias.

---

## Descripción del Proyecto

La Escuela Villas de Ayarco presentaba una problemática concreta: la información académica y administrativa (horarios, actividades, avisos y procedimientos) se encontraba dispersa en distintos canales de comunicación. Esto generaba desinformación, retrasos, dificultades de organización para los padres y una alta cantidad de consultas repetitivas hacia el personal administrativo.

La solución propuesta es una plataforma web accesible e intuitiva que centraliza toda esa información en un solo lugar, con costo cero para la institución y ejecutada de forma completamente remota por el equipo de desarrollo.

---

## Funcionalidades

### Para padres de familia

- Autenticación segura con correo y contraseña, con recuperación de contraseña por correo
- Consulta del horario semanal de clases de sus hijos, con indicación de última actualización; mensaje informativo si el horario no está disponible aún
- Agendamiento de citas con docentes o personal administrativo, con notificaciones por correo al crear, confirmar, rechazar o cancelar; consulta del historial de citas con su estado actual
- Visualización de actividades extraclase, eventos y comunicados, filtrados automáticamente por el nivel y grupo del hijo, con opción de filtrar por tipo de contenido y fecha
- Soporte para múltiples hijos vinculados a una misma cuenta, con selector entre estudiantes
- Consulta al *chatbot* institucional con inteligencia artificial para resolver dudas frecuentes en lenguaje natural

### Para personal institucional (docentes y administradores)

- Gestión de usuarios: registro de padres de familia y vinculación con uno o más estudiantes
- Administración de horarios: carga, modificación y eliminación de entradas por grupo y nivel
- Publicación, edición y eliminación de actividades, eventos y comunicados, segmentados por nivel o grupo
- Configuración de disponibilidad para citas por días y bloques horarios
- Gestión de solicitudes de citas con control de estados: Pendiente, Confirmada, Rechazada, Cancelada y Completada
- El sistema impide el agendamiento de citas duplicadas en el mismo bloque con el mismo funcionario

---

## Atributos de Calidad

- Accesible desde Chrome, Firefox, Edge y Safari en escritorio y dispositivos móviles
- Tiempo de respuesta promedio inferior a tres segundos en operaciones regulares
- Disponibilidad mínima del 99% durante el horario lectivo de la institución
- Comunicación cifrada mediante HTTPS en todas las rutas
- Contraseñas almacenadas con *hashing* seguro (bcrypt) vía Supabase Auth
- Control de acceso por rol validado del lado del servidor
- Validación de entradas para prevenir inyección SQL y ataques XSS
- Mensajes de error claros sin exponer información técnica sensible
- Interfaz intuitiva y consistente orientada a usuarios con distintos niveles de experiencia digital
- Código documentado y estructurado de forma modular para facilitar el mantenimiento

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| *Frontend* | Next.js |
| Base de datos y *backend* | Supabase |
| Despliegue | Vercel |
| Asistencia de desarrollo | Cursor, Claude Code, Stitch |

Todas las herramientas operan bajo planes gratuitos, en cumplimiento del compromiso de costo cero para la institución.

---

## Arquitectura

El sistema sigue una arquitectura de tres capas: presentación (*frontend* desarrollado con Next.js), lógica de negocio (*backend* con API REST) y almacenamiento de datos (Supabase). La comunicación entre el *frontend* y el *backend* se realiza mediante una API REST con respuestas en formato JSON. El despliegue se realiza en Vercel.

---

## Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| Padre de familia | Consulta información de sus hijos, agenda citas y usa el *chatbot* |
| Docente | Publica actividades, gestiona su disponibilidad y atiende solicitudes de citas |
| Administrador | Gestiona usuarios, horarios, publicaciones y tiene acceso completo al panel |

---

## Estructura del Proyecto (WBS)

```
Plataforma Web de Gestión Escolar
|
+-- 1. Gestión del Proyecto
|   +-- 1.1 Acta de constitución
|   +-- 1.2 Plan del proyecto
|   +-- 1.3 Registro de riesgos
|   +-- 1.4 Registro de interesados
|   +-- 1.5 Informes de avance
|   +-- 1.6 Control de cambios
|
+-- 2. Análisis y Diseño
|   +-- 2.1 Especificación de requerimientos
|   +-- 2.2 Diseño de arquitectura
|   +-- 2.3 Diseño de base de datos
|   +-- 2.4 Prototipos de interfaz
|   +-- 2.5 Plan de pruebas
|
+-- 3. Desarrollo del Sistema
|   +-- 3.1 Módulo de autenticación
|   +-- 3.2 Módulo de horarios
|   +-- 3.3 Módulo de citas
|   +-- 3.4 Módulo de comunicados
|   +-- 3.5 Chatbot con inteligencia artificial
|   +-- 3.6 Panel de administración
|   +-- 3.7 API REST del sistema
|
+-- 4. Infraestructura TI
|   +-- 4.1 Configuración de Supabase
|   +-- 4.2 Configuración de Vercel
|   +-- 4.3 Entorno de pruebas
|   +-- 4.4 Entorno de producción
|
+-- 5. Pruebas y Calidad
|   +-- 5.1 Pruebas unitarias
|   +-- 5.2 Pruebas de integración
|   +-- 5.3 Pruebas de usuario (UAT)
|   +-- 5.4 Informe de resultados
|   +-- 5.5 Correcciones validadas
|
+-- 6. Cierre del Proyecto
    +-- 6.1 Sistema en producción
    +-- 6.2 Documentación técnica
    +-- 6.3 Manual de usuario
    +-- 6.4 Manual del administrador
    +-- 6.5 Lecciones aprendidas
    +-- 6.6 Acta de cierre
```

---

## Consideraciones del Proyecto

- El proyecto se ejecuta de forma completamente remota, sin intervención presencial del equipo en la institución
- El sistema está diseñado exclusivamente para la Escuela Villas de Ayarco
- Presupuesto: cero colones - todas las herramientas operan en planes gratuitos
- El *chatbot* con inteligencia artificial fue incorporado a solicitud de la profesora del curso el 04/04/2026
- La capacidad de la base de datos y el ancho de banda están sujetos a los límites del plan gratuito de Supabase y Vercel

---

## Equipo de Desarrollo

| Nombre | Carné | Rol |
|--------|-------|-----|
| John Ceciliano Piedra | 2023267790 | Coordinador General y Desarrollador Principal |
| Andrés Dittel Morales | 2024096887 | Responsable de Comunicación y Documentación |
| Josué Astorga Granados | 2024120742 | Encargado de Investigación y Formato |
| Brandon Rojas Garita | 2024089186 | Desarrollador Técnico y Diseñador |

---

## Institución Beneficiaria

**Escuela Villas de Ayarco**  
Directora: Kimberly Bonilla Nogura

---

## Contexto Académico

Proyecto final del curso **TI-2800 - Administración de Proyectos I**  
Escuela de Administración de Tecnología de Información  
Tecnológico de Costa Rica - I Semestre 2026  
Profesora: Ing. Sonia Mora González
