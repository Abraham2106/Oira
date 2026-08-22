import { Button, Card } from "@notalocal/ui"
import { ModelStatus } from "../../components/ModelStatus"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"

type Props = {
  onClose: () => void
}

export function SettingsScreen({ onClose }: Props) {
  return (
    <div className="stack page">
      <div className="actions">
        <h1 className="page-title">Privacidad y uso</h1>
        <Button onClick={onClose}>Volver</Button>
      </div>
      <ModelStatus state="LOCAL_INFERENCE_READY" />
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
          Sin dato confirmado por el backend se muestra DESCONOCIDO. Esta pantalla no afirma
          cumplimiento legal.
        </p>
      </Card>
      <Card title="Retención y borrado">
        <p>
          Los controles de retención y borrado están deshabilitados: el prototipo mock no guarda
          SQLite ni audio. No hay interruptor decorativo.
        </p>
        <Button disabled>Borrar datos (no disponible en el prototipo)</Button>
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
    </div>
  )
}
