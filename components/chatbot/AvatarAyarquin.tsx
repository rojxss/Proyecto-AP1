'use client'
/**
 * Avatar de Ayarquín con fallback al emoji 🦉 si la imagen no carga.
 * Componente cliente necesario para manejar el evento onError.
 */

interface Props {
  size?: number
}

export default function AvatarAyarquin({ size = 36 }: Props) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--verde-100)', border: '2px solid var(--verde-500)',
      flexShrink: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Mascota.png"
        alt="Ayarquín"
        width={size} height={size}
        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        onError={(e) => {
          const img = e.currentTarget
          img.style.display = 'none'
          const fallback = img.nextElementSibling as HTMLElement | null
          if (fallback) fallback.style.display = 'flex'
        }}
      />
      <span style={{ fontSize: size * 0.6, display: 'none', alignItems: 'center', justifyContent: 'center' }}>
        🦉
      </span>
    </div>
  )
}
