import { Card } from "@oira/ui"

export function TeamScreen() {
  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">Equipo</span>
        </div>
        <h1 className="page-title">Equipo y responsabilidades</h1>
        <p className="muted config-lede">
          La IA redacta; el médico decide. Cada nota lleva revisión humana antes de salir de Oira.
        </p>
      </header>

      <Card title="Sesión actual">
        <dl className="privacy">
          <div className="privacy-row">
            <dt>Profesional</dt>
            <dd>Uso local en este equipo, sin cuenta en línea</dd>
          </div>
          <div className="privacy-row">
            <dt>Rol</dt>
            <dd>Documentación asistida de consultas</dd>
          </div>
          <div className="privacy-row">
            <dt>Autorización</dt>
            <dd>La confirmación de revisión es individual y no transferible</dd>
          </div>
        </dl>
      </Card>

      <Card title="Quién hace qué">
        <ol className="how-steps">
          <li>La IA transcribe la consulta y redacta un borrador estructurado.</li>
          <li>El profesional que atendió revisa cada sección contra su propio criterio.</li>
          <li>Solo el médico acepta y exporta: nada sale de Oira sin esa confirmación explícita.</li>
        </ol>
      </Card>

      <aside className="tip-card">
        <h4>Principio del producto</h4>
        <p>
          «IA que documenta · tú decides.» El borrador es una propuesta; la nota válida es la que
          usted acepta.
        </p>
      </aside>
    </div>
  )
}
