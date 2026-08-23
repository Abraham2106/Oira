import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@oira/ui"
import { BrowserAudioCapture } from "../../audio/audioCapture"
import { listAudioInputDevices, type AudioDeviceInfo } from "../../audio/audioDevice"
import { ModelStatus } from "../../components/ModelStatus"

type Props = {
  onContinue: () => void
  onOpenSettings: () => void
}

export function DeviceReadyScreen({ onContinue, onOpenSettings }: Props) {
  const [devices, setDevices] = useState<AudioDeviceInfo[] | null>(null)
  const [selectedId, setSelectedId] = useState<string>("")
  const [testing, setTesting] = useState(false)
  const [level, setLevel] = useState(0)
  const [testError, setTestError] = useState<string | null>(null)
  const captureRef = useRef<BrowserAudioCapture | null>(null)

  useEffect(() => {
    let cancelled = false
    listAudioInputDevices()
      .then((found) => {
        if (cancelled) return
        setDevices(found)
        setSelectedId(found[0]?.deviceId ?? "")
      })
      .catch(() => {
        if (!cancelled) setDevices([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!testing) return
    const timer = window.setInterval(() => {
      setLevel(captureRef.current?.getLevel() ?? 0)
    }, 100)
    return () => window.clearInterval(timer)
  }, [testing])

  useEffect(() => {
    const ref = captureRef
    return () => {
      const active = ref.current
      ref.current = null
      if (active) void active.stop().catch(() => undefined)
    }
  }, [])

  const stopTest = useCallback(async () => {
    const capture = captureRef.current
    captureRef.current = null
    setTesting(false)
    setLevel(0)
    if (!capture) return
    try {
      await capture.stop()
    } catch {
      setTestError("No se pudo detener la prueba de micrófono.")
    }
  }, [])

  const startTest = useCallback(async () => {
    setTestError(null)
    const capture = new BrowserAudioCapture()
    captureRef.current = capture
    try {
      await capture.start(selectedId || undefined)
      if (captureRef.current !== capture) {
        await capture.stop().catch(() => undefined)
        return
      }
      setTesting(true)
    } catch (error) {
      captureRef.current = null
      setTesting(false)
      setLevel(0)
      setTestError(error instanceof Error ? error.message : "No se pudo probar el micrófono.")
    }
  }, [selectedId])

  const toggleTest = useCallback(() => {
    if (testing) void stopTest()
    else void startTest()
  }, [testing, startTest, stopTest])

  const levelPercent = Math.min(100, Math.max(0, Math.round(level * 100)))
  const levelLabel =
    testing && levelPercent > 8 ? "Detectando audio…" : testing ? "Esperando audio…" : "Sin prueba activa"

  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">Configuración</span>
          <span className="meta-dot" aria-hidden="true">
            •
          </span>
          <span className="muted">Paso 1 de 3</span>
        </div>
        <h1 className="page-title">Configuración inicial</h1>
        <p className="muted config-lede">
          Prepare su entorno para una transcripción clínica óptima. Asegúrese de que su audio esté
          correctamente configurado antes de que entre el paciente.
        </p>
      </header>

      <div className="config-grid">
        <div className="config-main">
          <section className="nl-card config-card">
            <div className="config-card-head">
              <h2 className="config-card-title">Origen de audio</h2>
              <span className="req-pill">Requerido</span>
            </div>
            <p className="muted config-note">
              Seleccione el micrófono que utilizará para dictar o grabar las consultas. La prueba es
              local: el audio se procesa en este equipo, no se envía a ningún servidor y no queda
              guardado.
            </p>

            <div className="audio-device-list" role="radiogroup" aria-label="Dispositivo de entrada">
              {devices === null ? (
                <p className="muted audio-device-note">Buscando dispositivos de entrada…</p>
              ) : devices.length === 0 ? (
                <p className="muted audio-device-note">
                  No se detectaron micrófonos. Si continúa, la consulta usará el dispositivo
                  predeterminado del sistema.
                </p>
              ) : (
                devices.map((device) => {
                  const selected = selectedId === device.deviceId
                  return (
                    <label
                      key={device.deviceId}
                      className={selected ? "audio-option audio-option-active" : "audio-option"}
                    >
                      <input
                        type="radio"
                        name="oira-audio-device"
                        value={device.deviceId}
                        checked={selected}
                        onChange={() => setSelectedId(device.deviceId)}
                        disabled={testing}
                      />
                      <span className="audio-radio" aria-hidden="true">
                        <span className="audio-radio-dot" />
                      </span>
                      <span className="audio-option-text">
                        <strong>
                          {device.label.trim() ? device.label : "Micrófono sin identificar"}
                        </strong>
                        <small>
                          {device.isBluetooth
                            ? "Dispositivo Bluetooth conectado."
                            : "Micrófono del sistema."}
                        </small>
                      </span>
                      {device.isBluetooth ? (
                        <span className="nl-badge nl-badge-info">Bluetooth</span>
                      ) : null}
                    </label>
                  )
                })
              )}
            </div>

            <div className="mic-test-row">
              <button type="button" className="nl-button" onClick={toggleTest}>
                {testing ? "Detener prueba" : "Probar micrófono"}
              </button>
              <div className="mic-test-meter">
                <div
                  className="level-meter"
                  role="img"
                  aria-label={`Nivel de entrada del micrófono: ${levelPercent}%`}
                >
                  <div className="level-meter-fill" style={{ width: `${levelPercent}%` }} />
                </div>
                <span className="mic-test-caption">{levelLabel}</span>
              </div>
            </div>
            {testError ? (
              <p className="audio-test-error" role="alert">
                {testError}
              </p>
            ) : null}
          </section>

          <section className="nl-card config-card">
            <div className="config-card-head">
              <h2 className="config-card-title">Detalles de privacidad</h2>
            </div>
            <table className="privacy-table">
              <thead>
                <tr>
                  <th scope="col">Componente</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Grabación</td>
                  <td>
                    <span className="state-pill state-pill-idle">
                      <span className="state-dot state-dot-idle" aria-hidden="true" />
                      Inactiva
                    </span>
                  </td>
                  <td>Solo este equipo</td>
                </tr>
                <tr>
                  <td>Procesamiento</td>
                  <td>
                    <span className="state-pill state-pill-ready">
                      <span className="state-dot state-dot-ready" aria-hidden="true" />
                      Local
                    </span>
                  </td>
                  <td>En este equipo, sin servidores externos</td>
                </tr>
                <tr>
                  <td>Almacenamiento</td>
                  <td>
                    <span className="state-pill state-pill-idle">
                      <span className="state-dot state-dot-idle" aria-hidden="true" />
                      DESCONOCIDO
                    </span>
                  </td>
                  <td>Sin confirmación del backend</td>
                </tr>
                <tr>
                  <td>Red</td>
                  <td>
                    <span className="state-pill state-pill-idle">
                      <span className="state-dot state-dot-idle" aria-hidden="true" />
                      DESCONOCIDO
                    </span>
                  </td>
                  <td>Sin confirmación del backend</td>
                </tr>
              </tbody>
            </table>
            <p className="muted privacy-table-note">
              Lo que el sistema aún no confirma se muestra como DESCONOCIDO. Ninguna fila afirma
              cumplimiento legal.
            </p>
          </section>
        </div>

        <div className="config-side">
          <section className="nl-card status-card">
            <h2 className="config-card-title">Estado del sistema</h2>
            <div className="status-tiles">
              <div className="status-tile">
                <h4>Grabación</h4>
                <p>Inactiva</p>
              </div>
              <div className="status-tile">
                <h4>Procesamiento</h4>
                <p>Listo</p>
              </div>
            </div>
            <div className="status-engine">
              <ModelStatus state="LOCAL_INFERENCE_READY" />
            </div>
            <div className="status-actions">
              <Button variant="primary" onClick={onContinue}>
                Nueva consulta
              </Button>
              <Button onClick={onOpenSettings}>Ajustes avanzados</Button>
            </div>
          </section>

          <aside className="tip-card">
            <h4>Consejo clínico</h4>
            <p>
              Ambiente tranquilo y voz clara mejoran la precisión del borrador. Hable con naturalidad:
              usted revisa y corrige antes de aceptar.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
