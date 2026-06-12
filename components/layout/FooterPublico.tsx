interface Props {
  nombre: string
  lugar: string
  telefono: string
  correo: string
}

export default function FooterPublico({ nombre, lugar, telefono, correo }: Props) {
  return (
    <footer className="footer-publica">
      {nombre} · {lugar}
      {telefono && ` · ${telefono}`}
      {correo && ` · ${correo}`}
      <br />
      Plataforma de gestión escolar — desarrollada sin costo para la institución
      <style>{`
        .footer-publica { background: var(--verde-900); color: #BCD8C6; text-align: center; padding: 1.6rem; font-size: .84rem; }
      `}</style>
    </footer>
  )
}
