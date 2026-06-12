/**
 * Sidebar de la app autenticada.
 * Desktop: columna lateral fija. Móvil: barra horizontal con scroll.
 * Los ítems de menú varían por rol (padre / docente / admin).
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Rol } from '@/types/database'

interface Props {
  nombreUsuario: string
  rol: Rol
}

const ITEMS_PADRE = [
  { label: 'Horario', href: '/padre/horario' },
  { label: 'Citas', href: '/padre/citas' },
  { label: 'Publicaciones', href: '/padre/publicaciones' },
  { label: 'Asistente virtual', href: '/padre/chatbot' },
]

const ITEMS_DOCENTE = [
  { label: 'Mi disponibilidad', href: '/docente/disponibilidad' },
  { label: 'Citas', href: '/docente/citas' },
  { label: 'Publicaciones', href: '/docente/publicaciones' },
]

const ITEMS_ADMIN = [
  { label: 'Resumen', href: '/admin' },
  { label: 'Usuarios y vínculos', href: '/admin/usuarios' },
  { label: 'Horarios', href: '/admin/horarios' },
  { label: 'Publicaciones', href: '/admin/publicaciones' },
  { label: 'Citas', href: '/admin/citas' },
  { label: 'Página pública', href: '/admin/pagina-publica' },
]

const ITEMS_ROL: Record<Rol, typeof ITEMS_PADRE> = {
  padre: ITEMS_PADRE,
  docente: ITEMS_DOCENTE,
  admin: ITEMS_ADMIN,
}

const ETIQUETA_ROL: Record<Rol, string> = {
  padre: 'Padre/Madre de familia',
  docente: 'Docente',
  admin: 'Administrador/a',
}

export default function Sidebar({ nombreUsuario, rol }: Props) {
  const pathname = usePathname()
  const items = ITEMS_ROL[rol]

  return (
    <aside className="sidebar" aria-label="Menú de navegación">
      <div className="sidebar-usuario">
        <b>{nombreUsuario}</b>
        <span>{ETIQUETA_ROL[rol]}</span>
      </div>

      <nav>
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname.startsWith(item.href) && (item.href !== '/admin' || pathname === '/admin') ? 'activo' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form action="/api/auth/signout" method="post">
        <button type="submit" className="sidebar-link peligro" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}>
          Cerrar sesión
        </button>
      </form>
    </aside>
  )
}
