'use client'

/**
 * ConfirmButton — botón que muestra un modal de confirmación propio
 * antes de enviar el formulario. Reemplaza window.confirm().
 * Client Component necesario para useState.
 */
import { useState, useRef } from 'react'

interface Props {
  mensaje: string
  /** Texto del botón de confirmación. Por defecto "Confirmar". */
  confirmLabel?: string
  /** Usa estilo btn-peligro en el botón de confirmar. Por defecto true. */
  peligro?: boolean
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export default function ConfirmButton({
  mensaje,
  confirmLabel = 'Confirmar',
  peligro = true,
  className,
  style,
  children,
}: Props) {
  const [abierto, setAbierto] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)

  function confirmar() {
    setAbierto(false)
    submitRef.current?.click()
  }

  return (
    <>
      {/* Botón visible — abre el diálogo */}
      <button type="button" className={className} style={style} onClick={() => setAbierto(true)}>
        {children}
      </button>

      {/* Botón oculto que realmente envía el form (type="submit") */}
      <button ref={submitRef} type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />

      {/* Modal de confirmación */}
      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.45)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setAbierto(false)}
        >
          <div
            style={{
              background: 'var(--blanco)',
              borderRadius: 'var(--radio)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              padding: '1.8rem',
              maxWidth: '380px',
              width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: '0.97rem', marginBottom: '1.5rem', lineHeight: 1.55 }}>
              {mensaje}
            </p>
            <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secundario"
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={peligro ? 'btn btn-peligro' : 'btn'}
                onClick={confirmar}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
