'use client'
/**
 * Carrusel de imágenes de la escuela para la página pública.
 * Se pausa al pasar el cursor. Avanza automáticamente cada 4.5 s.
 */

import { useState, useEffect, useCallback } from 'react'

const IMAGENES = [
  '/img_esc/489784903_1122274319913900_5052634273993440363_n.jpg',
  '/img_esc/489690541_1123309173143748_522376063186335501_n.jpg',
  '/img_esc/491830429_1128348332639832_203334108556136673_n.jpg',
  '/img_esc/476138586_1070560908418575_2361822506714843767_n.jpg',
  '/img_esc/548979770_1259878196153511_6975242124836154050_n.jpg',
  '/img_esc/590405566_1327841169357213_1482574534091302897_n.jpg',
  '/img_esc/477249826_1075922804549052_380056779007554559_n.jpg',
  '/img_esc/490092322_1124097083064957_234129113803710008_n.jpg',
  '/img_esc/492492217_1136175318523800_1334681907544721685_n.jpg',
  '/img_esc/543429179_1249931177148213_6216937454190232032_n.jpg',
  '/img_esc/598322461_1341563234651673_9023852440474550029_n.jpg',
]

export default function CarruselEscuela() {
  const [actual, setActual]   = useState(0)
  const [pausado, setPausado] = useState(false)

  const siguiente = useCallback(() =>
    setActual(a => (a + 1) % IMAGENES.length), [])

  const anterior = useCallback(() =>
    setActual(a => (a - 1 + IMAGENES.length) % IMAGENES.length), [])

  useEffect(() => {
    if (pausado) return
    const t = setInterval(siguiente, 4500)
    return () => clearInterval(t)
  }, [pausado, siguiente])

  return (
    <>
      <div
        className="carrusel-wrapper"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        onTouchStart={() => setPausado(true)}
        onTouchEnd={() => setPausado(false)}
        role="region"
        aria-label="Galería de imágenes de la escuela"
      >
        {/* Pista de imágenes */}
        <div
          className="carrusel-pista"
          style={{ transform: `translateX(-${actual * 100}%)` }}
        >
          {IMAGENES.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`Foto de la Escuela Villas de Ayarco ${i + 1}`}
              className="carrusel-imagen"
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          ))}
        </div>

        {/* Flechas */}
        <button className="carrusel-flecha carrusel-prev" onClick={anterior} aria-label="Imagen anterior">
          &#8249;
        </button>
        <button className="carrusel-flecha carrusel-next" onClick={siguiente} aria-label="Imagen siguiente">
          &#8250;
        </button>

        {/* Indicadores */}
        <div className="carrusel-puntos" role="tablist">
          {IMAGENES.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === actual}
              aria-label={`Imagen ${i + 1} de ${IMAGENES.length}`}
              className={`carrusel-punto${i === actual ? ' activo' : ''}`}
              onClick={() => setActual(i)}
            />
          ))}
        </div>

        {/* Contador */}
        <span className="carrusel-contador">{actual + 1} / {IMAGENES.length}</span>
      </div>

      <style>{`
        .carrusel-wrapper {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: 14px;
          background: #111;
          aspect-ratio: 16 / 7;
          max-height: 480px;
          box-shadow: 0 4px 24px rgba(0,0,0,.18);
        }

        .carrusel-pista {
          display: flex;
          height: 100%;
          transition: transform 0.55s cubic-bezier(.4,0,.2,1);
          will-change: transform;
        }

        .carrusel-imagen {
          min-width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          flex-shrink: 0;
          user-select: none;
        }

        .carrusel-flecha {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,.45);
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          font-size: 1.9rem;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          transition: background .2s;
          backdrop-filter: blur(4px);
        }
        .carrusel-flecha:hover { background: rgba(0,0,0,.75); }
        .carrusel-prev { left: 12px; }
        .carrusel-next { right: 12px; }

        .carrusel-puntos {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 7px;
          z-index: 3;
        }

        .carrusel-punto {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255,255,255,.45);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: background .25s, transform .25s;
        }
        .carrusel-punto.activo {
          background: #fff;
          transform: scale(1.3);
        }

        .carrusel-contador {
          position: absolute;
          top: 12px;
          right: 14px;
          background: rgba(0,0,0,.45);
          color: #fff;
          font-size: .75rem;
          padding: 2px 8px;
          border-radius: 99px;
          backdrop-filter: blur(4px);
          z-index: 3;
          letter-spacing: .03em;
        }

        @media (max-width: 600px) {
          .carrusel-wrapper { aspect-ratio: 4 / 3; max-height: 320px; }
          .carrusel-flecha  { width: 36px; height: 36px; font-size: 1.5rem; }
        }
      `}</style>
    </>
  )
}
