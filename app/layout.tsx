/**
 * Root layout — carga fuentes y estilos globales.
 * No incluye estructura de página; cada route group tiene su propio layout.
 */
import type { Metadata } from 'next'
import { Bricolage_Grotesque, Atkinson_Hyperlegible } from 'next/font/google'
import './globals.css'

// Tipografía de display: encabezados y nombre de la institución
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  variable: '--font-display',
  display: 'swap',
})

// Tipografía de cuerpo: elegida por máxima legibilidad para usuarios con poca experiencia digital
const atkinson = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cuerpo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Plataforma Escolar — Escuela Villas de Ayarco',
  description: 'Acceso a horarios, citas con docentes, actividades y comunicados de la Escuela Villas de Ayarco, La Unión de Cartago.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Plataforma Escolar — Escuela Villas de Ayarco',
    description: 'Acceso a horarios, citas con docentes, actividades y comunicados de la Escuela Villas de Ayarco, La Unión de Cartago.',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Escudo Escuela Villas de Ayarco' }],
    locale: 'es_CR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  )
}
