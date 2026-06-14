/**
 * PaginaPublicaAdminPage — /admin/pagina-publica
 * Edición del contenido de institution_info: textos, avisos, FAQs y servicios.
 * SC-01, RF-01
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { InstitutionInfo } from '@/types/database'
import ConfirmButton from '@/components/ui/ConfirmButton'

// ── Server Actions ────────────────────────────────────────────────────────────

async function actualizarTexto(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id    = formData.get('id') as string
  const valor = (formData.get('valor') as string)?.trim()

  if (!id || valor === undefined) return

  await supabase.from('institution_info').update({ valor }).eq('id', id)

  revalidatePath('/admin/pagina-publica')
  revalidatePath('/')
}

async function crearAviso(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fecha  = formData.get('fecha') as string
  const titulo = (formData.get('titulo') as string)?.trim()
  const texto  = (formData.get('texto') as string)?.trim()

  if (!fecha || !titulo || !texto) return

  // Calcular siguiente orden
  const { data: existing } = await supabase
    .from('institution_info').select('orden').eq('tipo', 'aviso').order('orden', { ascending: false }).limit(1)
  const nextOrden = ((existing?.[0]?.orden as number) ?? 0) + 1

  // Clave única para el aviso
  const clave = `aviso_${Date.now()}`

  await supabase.from('institution_info').insert({
    clave,
    valor: `${fecha}|||${titulo}|||${texto}`,
    tipo: 'aviso',
    orden: nextOrden,
    validado: true,
  })

  revalidatePath('/admin/pagina-publica')
  revalidatePath('/')
}

async function crearFaq(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const pregunta  = (formData.get('pregunta') as string)?.trim()
  const respuesta = (formData.get('respuesta') as string)?.trim()

  if (!pregunta || !respuesta) return

  const { data: existing } = await supabase
    .from('institution_info').select('orden').eq('tipo', 'faq').order('orden', { ascending: false }).limit(1)
  const nextOrden = ((existing?.[0]?.orden as number) ?? 0) + 1

  await supabase.from('institution_info').insert({
    clave: `faq_${Date.now()}`,
    valor: JSON.stringify({ pregunta, respuesta }),
    tipo: 'faq',
    orden: nextOrden,
    validado: false,
  })

  revalidatePath('/admin/pagina-publica')
  revalidatePath('/')
}

async function crearServicio(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const valor = (formData.get('valor') as string)?.trim()
  if (!valor) return

  const { data: existing } = await supabase
    .from('institution_info').select('orden').eq('tipo', 'servicio').order('orden', { ascending: false }).limit(1)
  const nextOrden = ((existing?.[0]?.orden as number) ?? 0) + 1

  await supabase.from('institution_info').insert({
    clave: `servicio_${Date.now()}`,
    valor,
    tipo: 'servicio',
    orden: nextOrden,
    validado: true,
  })

  revalidatePath('/admin/pagina-publica')
  revalidatePath('/')
}

async function actualizarFaq(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id        = formData.get('id') as string
  const pregunta  = (formData.get('pregunta') as string)?.trim()
  const respuesta = (formData.get('respuesta') as string)?.trim()

  if (!id || !pregunta || !respuesta) return

  await supabase
    .from('institution_info')
    .update({ valor: JSON.stringify({ pregunta, respuesta }), validado: true })
    .eq('id', id)

  revalidatePath('/admin/pagina-publica')
  revalidatePath('/')
}

async function eliminarEntrada(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('institution_info').delete().eq('id', id)

  revalidatePath('/admin/pagina-publica')
  revalidatePath('/')
}

// ── Claves de texto editable ──────────────────────────────────────────────────

const CAMPOS_TEXTO: { clave: string; label: string; multilinea?: boolean }[] = [
  { clave: 'nombre',          label: 'Nombre de la escuela' },
  { clave: 'lugar',           label: 'Ubicación (ciudad/cantón)' },
  { clave: 'fundacion',       label: 'Año de fundación' },
  { clave: 'lema',            label: 'Lema de la plataforma' },
  { clave: 'direccion',       label: 'Dirección exacta' },
  { clave: 'telefono',        label: 'Teléfono' },
  { clave: 'correo',          label: 'Correo institucional' },
  { clave: 'horario_atencion',label: 'Horario de atención' },
  { clave: 'directora',       label: 'Directora' },
  { clave: 'secretaria',      label: 'Secretaria' },
  { clave: 'circuito',        label: 'Circuito / Dirección Regional' },
  { clave: 'resena',          label: 'Reseña histórica', multilinea: true },
]

// ── Página ────────────────────────────────────────────────────────────────────

export default async function PaginaPublicaAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: todosRaw } = await supabase
    .from('institution_info')
    .select('*')
    .order('orden')

  const todos = (todosRaw ?? []) as InstitutionInfo[]
  const textos   = todos.filter(i => i.tipo === 'texto')
  const avisos   = todos.filter(i => i.tipo === 'aviso').sort((a, b) => b.orden - a.orden)
  const faqs     = todos.filter(i => i.tipo === 'faq')
  const servicios = todos.filter(i => i.tipo === 'servicio')

  const getInfo = (clave: string) => textos.find(t => t.clave === clave)

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>Contenido de la página pública</h1>
      <p style={{ color: 'var(--tinta-suave)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
        Edite la información que se muestra en la página principal sin necesidad de tocar el código.
      </p>

      {/* ── Datos institucionales ──────────────────────────────────────── */}
      <div className="bloque-card" style={{ marginBottom: '1.4rem' }}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Datos institucionales</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {CAMPOS_TEXTO.map(campo => {
            const info = getInfo(campo.clave)
            if (!info) return null
            return (
              <form key={campo.clave} action={actualizarTexto} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <input type="hidden" name="id" value={info.id} />
                <div className="campo" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                  <label>{campo.label}</label>
                  {campo.multilinea ? (
                    <textarea name="valor" rows={3} defaultValue={info.valor} style={{ resize: 'vertical' }} />
                  ) : (
                    <input name="valor" type="text" defaultValue={info.valor} />
                  )}
                </div>
                <button type="submit" className="btn btn-secundario" style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', marginBottom: '1px' }}>
                  Guardar
                </button>
              </form>
            )
          })}
        </div>
      </div>

      {/* ── Avisos ──────────────────────────────────────────────────────── */}
      <div className="bloque-card" style={{ marginBottom: '1.4rem' }}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>Tablón de avisos ({avisos.length})</h2>

        <form action={crearAviso} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.7rem' }}>
            <div className="campo">
              <label htmlFor="av_fecha">Fecha *</label>
              <input id="av_fecha" name="fecha" type="text" maxLength={30} placeholder="09 jun 2026" required />
            </div>
            <div className="campo">
              <label htmlFor="av_titulo">Título *</label>
              <input id="av_titulo" name="titulo" type="text" maxLength={100} required placeholder="Título del aviso" />
            </div>
            <div className="campo" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="av_texto">Texto *</label>
              <textarea id="av_texto" name="texto" rows={2} required style={{ resize: 'vertical' }} />
            </div>
          </div>
          <button type="submit" className="btn" style={{ marginTop: '0.4rem' }}>Agregar aviso</button>
        </form>

        {avisos.length === 0 ? (
          <div className="mensaje-vacio" style={{ fontSize: '0.85rem' }}>No hay avisos publicados.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {avisos.map(a => {
              const [fecha, titulo, texto] = a.valor.split('|||')
              return (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem', background: 'var(--crema)', borderRadius: '8px', border: '1px solid var(--linea)' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.73rem', color: 'var(--tinta-suave)' }}>{fecha}</span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{titulo}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--tinta-suave)' }}>{texto}</div>
                  </div>
                  <form action={eliminarEntrada}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmButton
                      className="btn btn-peligro"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                      mensaje="¿Eliminar este aviso?"
                    >
                      Eliminar
                    </ConfirmButton>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Servicios ────────────────────────────────────────────────────── */}
      <div className="bloque-card" style={{ marginBottom: '1.4rem' }}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>Servicios de apoyo ({servicios.length})</h2>
        <form action={crearServicio} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
          <div className="campo" style={{ flex: 1, minWidth: '180px', marginBottom: 0 }}>
            <input name="valor" type="text" maxLength={60} required placeholder="Ej: Psicopedagogía" />
          </div>
          <button type="submit" className="btn btn-secundario" style={{ fontSize: '0.8rem' }}>Agregar</button>
        </form>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {servicios.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--verde-100)', borderRadius: '99px', padding: '0.2rem 0.7rem', fontSize: '0.82rem' }}>
              <span>{s.valor}</span>
              <form action={eliminarEntrada}>
                <input type="hidden" name="id" value={s.id} />
                <ConfirmButton style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rojo)', fontSize: '0.85rem', lineHeight: 1, padding: '0 2px' }} mensaje="¿Eliminar este servicio?">×</ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="bloque-card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>Preguntas frecuentes ({faqs.length})</h2>

        <form action={crearFaq} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div className="campo">
              <label htmlFor="faq_pregunta">Pregunta *</label>
              <input id="faq_pregunta" name="pregunta" type="text" maxLength={200} required />
            </div>
            <div className="campo">
              <label htmlFor="faq_respuesta">Respuesta *</label>
              <textarea id="faq_respuesta" name="respuesta" rows={3} required style={{ resize: 'vertical' }} />
            </div>
          </div>
          <button type="submit" className="btn" style={{ marginTop: '0.4rem' }}>Agregar pregunta</button>
        </form>

        {faqs.length === 0 ? (
          <div className="mensaje-vacio" style={{ fontSize: '0.85rem' }}>No hay preguntas frecuentes.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map(f => {
              let pregunta = '', respuesta = ''
              try {
                const p = JSON.parse(f.valor)
                pregunta = p.pregunta ?? ''; respuesta = p.respuesta ?? ''
              } catch {
                const partes = f.valor.split('|||')
                pregunta = partes[0] ?? ''; respuesta = partes[1] ?? ''
              }
              return (
                <div key={f.id} style={{ padding: '0.75rem', background: 'var(--crema)', borderRadius: '8px', border: '1px solid var(--linea)' }}>
                  {/* Formulario de edición */}
                  <form action={actualizarFaq}>
                    <input type="hidden" name="id" value={f.id} />
                    <div className="campo" style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.78rem' }}>Pregunta</label>
                      <input name="pregunta" type="text" maxLength={200} defaultValue={pregunta} required />
                    </div>
                    <div className="campo" style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.78rem' }}>Respuesta</label>
                      <textarea name="respuesta" rows={2} defaultValue={respuesta} required style={{ resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {!f.validado && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--gris)' }}>⚠ Pendiente de validación</span>
                      )}
                      <button type="submit" className="btn btn-secundario" style={{ fontSize: '0.78rem', padding: '0.3rem 0.8rem', marginLeft: 'auto' }}>
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                  {/* Botón eliminar (form separado — no se pueden anidar forms) */}
                  <form action={eliminarEntrada} style={{ marginTop: '0.4rem', textAlign: 'right' }}>
                    <input type="hidden" name="id" value={f.id} />
                    <ConfirmButton
                      className="btn btn-peligro"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                      mensaje="¿Eliminar esta pregunta?"
                    >
                      Eliminar
                    </ConfirmButton>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
