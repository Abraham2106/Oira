import { Button, Card } from "@oira/ui"
import { ModelStatus } from "../../components/ModelStatus"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"

type Props = {
  onClose: () => void
}

export function SettingsScreen({ onClose }: Props) {
  return (
    <div className="stack page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">Ajustes</span>
        </div>
        <h1 className="page-title">Privacidad y ajustes</h1>
      </header>

      <Card title="Motor de transcripción">
        <div className="status-engine">
          <ModelStatus state="LOCAL_INFERENCE_READY" />
        </div>
        <p className="muted">
          El borrador se genera en este equipo. Usted revisa cada sección antes de aceptarla.
        </p>
      </Card>

      <Card title="Estado reportado">
        <PrivacyStatusPanel
          rows={[
            { label: "Grabación", value: "Según la pantalla actual" },
            { label: "Procesamiento", value: "DESCONOCIDO" },
            { label: "Proveedor de IA remoto", value: "DESCONOCIDO" },
            { label: "Almacenamiento", value: "DESCONOCIDO" },
            { label: "Red", value: "DESCONOCIDO" },
          ]}
        />
        <p className="muted">
          Sin confirmación del sistema se muestra DESCONOCIDO. Esta pantalla no afirma cumplimiento
          legal.
        </p>
      </Card>

      <Card title="Retención y borrado">
        <p>
          Los controles de retención y borrado se activan cuando el almacenamiento cifrado del
          equipo esté conectado. No se muestran controles decorativos.
        </p>
        <Button disabled>Borrar todos los datos locales</Button>
        <p className="muted check-compact">
          El botón se habilitará junto con el almacenamiento cifrado.
        </p>
      </Card>

      <Card title="Atajos">
        <ul className="shortcut-list">
          <li>
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> detiene la grabación o acepta el borrador si ya
            confirmó.
          </li>
          <li>
            <kbd>Esc</kbd> cierra este panel y quita el resaltado del origen.
          </li>
          <li>
            <kbd>?</kbd> abre o cierra esta pantalla (fuera de un campo de texto).
          </li>
        </ul>
      </Card>

      <div className="actions">
        <Button onClick={onClose}>Volver</Button>
      </div>
    </div>
  )
}
