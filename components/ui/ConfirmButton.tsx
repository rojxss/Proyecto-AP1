'use client'

/**
 * Botón de envío de formulario que pide confirmación antes de proceder.
 * Client Component: permite usar onClick en Server Component pages.
 */
interface Props {
  mensaje: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export default function ConfirmButton({ mensaje, className, style, children }: Props) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      onClick={(e) => { if (!confirm(mensaje)) e.preventDefault() }}
    >
      {children}
    </button>
  )
}
