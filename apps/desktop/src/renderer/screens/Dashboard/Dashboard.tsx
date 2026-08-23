import { Button, Card } from "@oira/ui"
import type { ProductState } from "@oira/types"
import { Icon } from "../../components/icons"
import { ModelStatus } from "../../components/ModelStatus"
import { stateLabel } from "../../lib/stateLabels"

type Props = {
  productState: ProductState
  hasDraft: boolean
  onStartNew: () => void
  onOpenNotes: () => void
  onOpenSettings: () => void
}

export function DashboardScreen({
  productState,
  hasDraft,
  onStartNew,
  onOpenNotes,
  onOpenSettings,
}: Props) {
  const recordingActive = productState === "RECORDING"

  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">Panel</span>
          <span className="meta-dot" aria-hidden="true">
            •
          </span>
          <span className="muted">
            {new Date().toLocaleDateString("es", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
        <h1 className="page-title">Panel de documentación</h1>
        <p className="muted config-lede">
          Todo lo necesario para documentar una consulta: grabar, revisar y exportar. El borrador
          siempre espera su confirmación.
        </p>
      </header>

      <div className="config-grid">
        <div className="config-main">
          <div className="dash-tiles">
            <div className="dash-tile">
              <h4>Sesión</h4>
              <p>{hasDraft ? stateLabel(productState) : "Sin actividad"}</p>
            </div>
            <div className="dash-tile">
              <h4>Grabación</h4>
              <p>{recordingActive ? "Activa" : "Inactiva"}</p>
            </div>
            <div className="dash-tile">
              <h4>Borrador</h4>
              <p>{hasDraft ? "En curso" : "—"}</p>
            </div>
            <div className="dash-tile">
              <h4>Última nota</h4>
              <p>{productState === "EXPORTED" ? "Exportada" : "—"}</p>
            </div>
          </div>

          <div className="hub-grid">
            <button type="button" className="hub-card hub-card-primary" onClick={onStartNew}>
              <span className="hub-icon">
                <Icon name="mic" size={22} />
              </span>
              <span className="hub-body">
                <strong>Nueva consulta</strong>
                <small>
                  Grabe la consulta, revise el borrador sección por sección y expórtelo. Usted
                  decide qué queda.
                </small>
              </span>
              <span className="hub-arrow">
                <Icon name="arrow-right" />
              </span>
            </button>
            <button type="button" className="hub-card" onClick={onOpenNotes}>
              <span className="hub-icon">
                <Icon name="note" size={22} />
              </span>
              <span className="hub-body">
                <strong>Notas</strong>
                <small>Consulte las notas que aceptó y exportó desde este equipo.</small>
              </span>
              <span className="hub-arrow">
                <Icon name="arrow-right" />
              </span>
            </button>
          </div>

          <Card title="Sus datos">
            <p>
              La grabación y la nota se procesan en este equipo. Lo que el sistema aún no confirma
              se muestra como DESCONOCIDO en el panel de privacidad.
            </p>
            <div className="actions">
              <Button onClick={onOpenSettings}>Ver detalles de privacidad</Button>
            </div>
          </Card>
        </div>

        <div className="config-side">
          <section className="nl-card status-card">
            <h2 className="config-card-title">Estado del sistema</h2>
            <div className="status-engine">
              <ModelStatus state="LOCAL_INFERENCE_READY" />
            </div>
            <div className="status-actions">
              <Button variant="primary" onClick={onStartNew}>
                Nueva consulta
              </Button>
              <Button onClick={onOpenNotes}>Ir a notas</Button>
            </div>
          </section>

          <aside className="tip-card">
            <h4>Consejo clínico</h4>
            <p>
              Hable con naturalidad durante la consulta: el borrador se corrige y completa en la
              pantalla de revisión.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
