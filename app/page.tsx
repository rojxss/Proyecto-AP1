/**
 * SC-01 — Página pública institucional.
 * No requiere autenticación. Todos los datos vienen de la tabla institution_info (Supabase).
 */
import { createClient } from '@/lib/supabase/server'
import HeaderInstitucional from '@/components/layout/HeaderInstitucional'
import FooterPublico from '@/components/layout/FooterPublico'
import TablonAvisos from '@/components/publico/TablonAvisos'
import type { InstitutionInfo } from '@/types/database'

// Helpers para extraer valores del mapa clave→valor de institution_info
function val(infos: InstitutionInfo[], clave: string): string {
  return infos.find(i => i.clave === clave)?.valor ?? ''
}
function lista(infos: InstitutionInfo[], tipo: string): InstitutionInfo[] {
  return infos.filter(i => i.tipo === tipo).sort((a, b) => a.orden - b.orden)
}

export default async function PaginaPublica() {
  const supabase = await createClient()

  const { data: infos } = await supabase
    .from('institution_info')
    .select('*')
    .order('orden')

  const datos = (infos ?? []) as InstitutionInfo[]
  const avisos = lista(datos, 'aviso')
  const servicios = lista(datos, 'servicio')
  const faqs = lista(datos, 'faq')

  const nombre = val(datos, 'nombre') || 'Escuela Villas de Ayarco'
  const lugar = val(datos, 'lugar') || 'La Unión de Cartago'
  const fundacion = val(datos, 'fundacion') || '1991'
  const direccion = val(datos, 'direccion')
  const telefono = val(datos, 'telefono')
  const correo = val(datos, 'correo')
  const horarioAtencion = val(datos, 'horario_atencion')
  const directora = val(datos, 'directora')
  const circuito = val(datos, 'circuito')
  const resena = val(datos, 'resena')
  const lema = val(datos, 'lema')

  return (
    <>
      <HeaderInstitucional
        nombre={nombre}
        lugar={lugar}
        fundacion={fundacion}
        circuito={circuito}
        vistaActiva="inicio"
      />

      {/* Hero */}
      <section className="hero">
        <div className="hero-interno">
          <div>
            <h1>La información de la escuela, <em>en un solo lugar</em></h1>
            <p className="hero-lema">{lema}</p>
            <a className="btn btn-amarillo" href="/login">Ingresar a la plataforma</a>
            <a
              className="btn"
              style={{ marginLeft: '0.6rem', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.5)' }}
              href="#escuela"
            >
              Conocer la escuela
            </a>
          </div>
          <div className="tarjeta-datos">
            {direccion && <div><span className="ico">⌖</span><span>{direccion}</span></div>}
            {telefono && <div><span className="ico">✆</span><span>{telefono}</span></div>}
            {correo && <div><span className="ico">✉</span><span>{correo}</span></div>}
            {horarioAtencion && <div><span className="ico">◷</span><span>{horarioAtencion}</span></div>}
            {directora && <div><span className="ico">👤</span><span>Directora: {directora}</span></div>}
          </div>
        </div>
      </section>

      <main className="main-publica">
        {/* Tablón de avisos */}
        <TablonAvisos avisos={avisos} />

        <div style={{ height: '1.6rem' }} />

        {/* Historia y servicios */}
        <div id="escuela" className="dos-col">
          <div className="bloque-card">
            <div className="eyebrow">Nuestra historia</div>
            <h2>Una escuela nacida de su comunidad</h2>
            <p>{resena}</p>
          </div>
          <div className="bloque-card">
            <div className="eyebrow">Servicios de apoyo</div>
            <h2>Acompañamos a cada estudiante</h2>
            <p>La institución cuenta con servicios profesionales de apoyo para el desarrollo integral de la niñez:</p>
            <div className="servicios-chips">
              {servicios.map(s => (
                <span key={s.id}>{s.valor}</span>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        {faqs.length > 0 && (
          <div className="bloque-card">
            <div className="eyebrow">Preguntas frecuentes</div>
            <h2>Antes de llamar, consulte aquí</h2>
            <div className="faq-lista">
              {faqs.map(f => {
                const [pregunta, respuesta] = f.valor.split('|||')
                return (
                  <details key={f.id} className="faq-item">
                    <summary>{pregunta}</summary>
                    <p>{respuesta}</p>
                  </details>
                )
              })}
            </div>
            <p className="faq-nota">
              ¿Tiene cuenta de padre de familia? El <b>asistente virtual</b> dentro de la plataforma responde estas y otras consultas al instante.
            </p>
          </div>
        )}
      </main>

      <FooterPublico nombre={nombre} lugar={lugar} telefono={telefono} correo={correo} />
    </>
  )
}
