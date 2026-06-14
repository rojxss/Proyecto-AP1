/**
 * Cabecera institucional compartida por la página pública y las vistas autenticadas.
 * La nav de la barra varía según si el usuario está autenticado.
 */
import Link from 'next/link'

interface Props {
  nombre: string
  lugar: string
  fundacion: string
  circuito: string
  vistaActiva?: 'inicio' | 'escuela' | 'faq'
  autenticado?: boolean
}

export default function HeaderInstitucional({
  nombre,
  lugar,
  fundacion,
  circuito,
  vistaActiva,
  autenticado = false,
}: Props) {
  return (
    <>
      <div className="franja-mep">
        Ministerio de Educación Pública · {circuito}
      </div>
      <header className="header-inst">
        {/* Escudo / logo — enlaza al inicio */}
        <Link href="/" className="escudo-logo" aria-label={`Ir al inicio — Escudo de ${nombre}`}>
          <img src="/logo.png" alt={`Escudo de ${nombre}`} width={52} height={52} style={{ objectFit: 'contain' }} />
        </Link>

        <div className="header-nombres">
          <b>{nombre}</b>
          <span>{lugar} · Fundada en {fundacion}</span>
        </div>

        {/* Navegación pública */}
        {!autenticado && (
          <nav className="header-nav" aria-label="Navegación principal">
            <Link href="/" className={vistaActiva === 'inicio' ? 'activo' : ''}>
              Inicio
            </Link>
            <Link href="/#escuela" className={vistaActiva === 'escuela' ? 'activo' : ''}>
              Nuestra escuela
            </Link>
            <Link href="/#faq" className={vistaActiva === 'faq' ? 'activo' : ''}>
              Preguntas frecuentes
            </Link>
            <Link href="/login" className="btn btn-amarillo" style={{ padding: '0.45rem 1rem' }}>
              Ingresar
            </Link>
          </nav>
        )}
      </header>

      <style>{`
        .header-inst { background: var(--verde-700); color: #fff; padding: .85rem 1.2rem; display: flex; align-items: center; gap: .9rem; flex-wrap: wrap; }
        .header-nav { margin-left: auto; display: flex; gap: .3rem; flex-wrap: wrap; align-items: center; }
        .header-nav a { color: #fff; text-decoration: none; padding: .45rem .85rem; border-radius: 8px; font-size: .88rem; }
        .header-nav a.activo { background: rgba(255,255,255,.16); outline: 2px solid var(--amarillo); }
        .header-nav a:hover:not(.activo):not(.btn-amarillo) { background: rgba(255,255,255,.12); }
        @media(max-width:640px) { .header-nav { display: none; } }
      `}</style>
    </>
  )
}
