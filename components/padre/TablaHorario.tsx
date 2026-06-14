/**
 * TablaHorario
 * Componente presentacional (Server Component compatible).
 * Renderiza la tabla semanal de lunes a viernes con los bloques horarios.
 *
 * Props:
 *   bloques  — todos los time_blocks ordenados por `orden`
 *   entradas — schedule_entries del grupo con join de bloque y docente
 */
import type { DiaSemana, ScheduleEntryConDetalles, TimeBlock } from '@/types/database'

interface Props {
  bloques: TimeBlock[]
  entradas: ScheduleEntryConDetalles[]
}

const DIAS: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function TablaHorario({ bloques, entradas }: Props) {
  // Construir índice: bloque_id → dia → entrada
  const indice = new Map<string, Map<DiaSemana, ScheduleEntryConDetalles>>()
  for (const entrada of entradas) {
    if (!indice.has(entrada.bloque_id)) {
      indice.set(entrada.bloque_id, new Map())
    }
    indice.get(entrada.bloque_id)!.set(entrada.dia, entrada)
  }

  return (
    <div className="horario-wrapper">
      <table className="horario">
        <thead>
          <tr>
            <th scope="col">Hora</th>
            {DIAS.map((dia) => (
              <th key={dia} scope="col">{dia}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bloques.map((bloque) => {
            if (bloque.es_receso) {
              return (
                <tr key={bloque.id}>
                  <td className="bloque-hora">{bloque.etiqueta}</td>
                  <td colSpan={5} className="receso">Receso</td>
                </tr>
              )
            }
            if (bloque.es_almuerzo) {
              return (
                <tr key={bloque.id}>
                  <td className="bloque-hora">{bloque.etiqueta}</td>
                  <td colSpan={5} className="receso">Almuerzo</td>
                </tr>
              )
            }

            const diasMap = indice.get(bloque.id)

            return (
              <tr key={bloque.id}>
                <td className="bloque-hora">{bloque.etiqueta}</td>
                {DIAS.map((dia) => {
                  const entrada = diasMap?.get(dia)
                  if (!entrada) {
                    return <td key={dia} className="celda-vacia" aria-label="Sin materia asignada" />
                  }
                  return (
                    <td key={dia}>
                      <b>{entrada.materia}</b>
                      {entrada.docente && (
                        <span className="docente-nombre">
                          {entrada.docente.nombre_completo}
                        </span>
                      )}
                      {entrada.aula && (
                        <span className="aula">{entrada.aula}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
