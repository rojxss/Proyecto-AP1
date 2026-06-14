-- Fix: los docentes necesitan ver perfiles de padres para mostrar
-- el nombre del solicitante en la vista de citas.
-- Se reemplaza la política profiles_select con una más permisiva:
-- cualquier usuario autenticado puede leer todos los perfiles
-- (nombre_completo, rol, activo — no hay datos sensibles en profiles).

DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );
