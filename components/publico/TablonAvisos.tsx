/**
 * Tablón de avisos de la página pública.
 * Estilo de notas ancladas con chinche (pin), tal como el mockup aprobado.
 */
import type { InstitutionInfo } from '@/types/database'

interface Props {
  avisos: InstitutionInfo[]
}

export default function TablonAvisos({ avisos }: Props) {
  if (avisos.length === 0) return null

  return (
    <section className="tablon" aria-label="Tablón de avisos">
      <h2>
        <span className="pin" aria-hidden="true" />
        Tablón de avisos
      </h2>
      <div className="avisos-grid">
        {avisos.map((aviso, idx) => {
          // Formato del valor: "FECHA|||TITULO|||TEXTO"
          const [fecha, titulo, texto] = aviso.valor.split('|||')
          return (
            <article key={aviso.id} className={`aviso-nota aviso-nota--${idx % 2 === 0 ? 'par' : 'impar'}`}>
              <time dateTime={fecha} className="aviso-fecha">{fecha}</time>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          )
        })}
      </div>

      <style>{`
        .tablon { background: var(--amarillo-suave); border: 1px solid #EBD9A8; border-radius: var(--radio); padding: 1.6rem; }
        .tablon h2 { display: flex; align-items: center; gap: .55rem; font-size: 1.3rem; margin-bottom: 1rem; }
        .pin { width: 14px; height: 14px; border-radius: 50%; background: var(--rojo); box-shadow: inset -2px -2px 3px rgba(0,0,0,.3); flex-shrink: 0; }
        .avisos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px,1fr)); gap: 1rem; }
        .aviso-nota { background: var(--blanco); border: 1px solid var(--linea); border-radius: 10px; padding: 1rem; position: relative; box-shadow: var(--sombra); transition: transform 0.4s cubic-bezier(.34,1.56,.64,1), box-shadow 0.4s ease; }
        .aviso-nota::before { content: ""; position: absolute; top: -7px; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; border-radius: 50%; background: var(--verde-500); box-shadow: inset -2px -2px 3px rgba(0,0,0,.25); }
        .aviso-nota--par { transform: rotate(-.5deg); }
        .aviso-nota--par:hover { transform: rotate(-.5deg) scale(1.06); box-shadow: 0 10px 28px rgba(20,83,43,.18); }
        .aviso-nota--impar { transform: rotate(.55deg); }
        .aviso-nota--impar:hover { transform: rotate(.55deg) scale(1.06); box-shadow: 0 10px 28px rgba(20,83,43,.18); }
        .aviso-fecha { font-size: .74rem; color: var(--tinta-suave); text-transform: uppercase; letter-spacing: .06em; }
        .aviso-nota h3 { font-size: 1rem; margin: .25rem 0 .3rem; }
        .aviso-nota p { font-size: .88rem; color: var(--tinta-suave); }
      `}</style>
    </section>
  )
}
