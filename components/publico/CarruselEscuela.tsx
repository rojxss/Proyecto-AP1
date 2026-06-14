'use client'
/**
 * Carrusel de imágenes de la escuela — solo automático, sin controles.
 * Crossfade suave cada 4.5 s. Se pausa al perder visibilidad (IntersectionObserver).
 */

import { useState, useEffect, useRef } from 'react'

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
  const [actual, setActual] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const visible = useRef(true)

  // Pausar cuando el carrusel sale del viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { visible.current = e.isIntersecting },
      { threshold: 0.2 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      if (visible.current) setActual(a => (a + 1) % IMAGENES.length)
    }, 4500)
    return () => clearInterval(t)
  }, [])

  return (
    <div ref={ref} className="carrusel-auto" role="img" aria-label="Galería de imágenes de la Escuela Villas de Ayarco">
      {IMAGENES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`carrusel-auto-img${i === actual ? ' visible' : ''}`}
          draggable={false}
        />
      ))}
      {/* Degradado inferior sutil */}
      <div className="carrusel-auto-gradiente" />
    </div>
  )
}
