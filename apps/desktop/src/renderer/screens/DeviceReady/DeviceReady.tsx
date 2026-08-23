import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@oira/ui"
import { BrowserAudioCapture } from "../../audio/audioCapture"
import { listAudioInputDevices, type AudioDeviceInfo } from "../../audio/audioDevice"
import { ModelStatus } from "../../components/ModelStatus"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  onContinue: () => void
  onOpenSettings: () => void
}

export function DeviceReadyScreen({ onContinue, onOpenSettings }: Props) {
  const { t } = useI18n()
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
      setTestError(t("deviceReady.testErrorStop"))
    }
  }, [t])

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
      setTestError(error instanceof Error ? error.message : t("deviceReady.testErrorStart"))
    }
  }, [selectedId, t])

  const toggleTest = useCallback(() => {
    if (testing) void stopTest()
    else void startTest()
  }, [testing, startTest, stopTest])

  const levelPercent = Math.min(100, Math.max(0, Math.round(level * 100)))
  const levelLabel = testing
    ? levelPercent > 8
      ? t("deviceReady.detecting")
      : t("deviceReady.waitingForAudio")
    : t("deviceReady.noTest")

  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">{t("deviceReady.kicker")}</span>
          <span className="meta-dot" aria-hidden="true">
            •
          </span>
          <span className="muted">
            {t("deviceReady.stepOf").replace("{current}", "1").replace("{total}", "3")}
          </span>
        </div>
        <h1 className="page-title">{t("deviceReady.title")}</h1>
        <p className="muted config-lede">{t("deviceReady.lede")}</p>
      </header>

      <div className="config-grid">
        <div className="config-main">
          <section className="nl-card config-card">
            <div className="config-card-head">
              <h2 className="config-card-title">{t("deviceReady.audioSourceTitle")}</h2>
              <span className="req-pill">{t("deviceReady.required")}</span>
            </div>
            <p className="muted config-note">{t("deviceReady.audioSourceNote")}</p>

            <div className="audio-device-list" role="radiogroup" aria-label={t("deviceReady.deviceAria")}>
              {devices === null ? (
                <p className="muted audio-device-note">{t("deviceReady.searchingDevices")}</p>
              ) : devices.length === 0 ? (
                <p className="muted audio-device-note">{t("deviceReady.noDevices")}</p>
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
                          {device.label.trim() ? device.label : t("deviceReady.unlabeledMic")}
                        </strong>
                        <small>
                          {device.isBluetooth
                            ? t("deviceReady.bluetooth")
                            : t("deviceReady.systemMic")}
                        </small>
                      </span>
                      {device.isBluetooth ? (
                        <span className="nl-badge nl-badge-info">{t("deviceReady.bluetoothBadge")}</span>
                      ) : null}
                    </label>
                  )
                })
              )}
            </div>

            <div className="mic-test-row">
              <button type="button" className="nl-button" onClick={toggleTest}>
                {testing ? t("deviceReady.stopTest") : t("deviceReady.startTest")}
              </button>
              <div className="mic-test-meter">
                <div
                  className="level-meter"
                  role="img"
                  aria-label={t("deviceReady.levelAria").replace("{level}", String(levelPercent))}
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
              <h2 className="config-card-title">{t("deviceReady.privacyDetailsTitle")}</h2>
            </div>
            <table className="privacy-table">
              <thead>
                <tr>
                  <th scope="col">{t("deviceReady.colComponent")}</th>
                  <th scope="col">{t("deviceReady.colStatus")}</th>
                  <th scope="col">{t("deviceReady.colDetail")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t("privacy.recording")}</td>
                  <td>
                    <span className="state-pill state-pill-idle">
                      <span className="state-dot state-dot-idle" aria-hidden="true" />
                      {t("dashboard.inactive")}
                    </span>
                  </td>
                  <td>{t("deviceReady.recordingDetail")}</td>
                </tr>
                <tr>
                  <td>{t("privacy.processing")}</td>
                  <td>
                    <span className="state-pill state-pill-ready">
                      <span className="state-dot state-dot-ready" aria-hidden="true" />
                      {t("deviceReady.processingValue")}
                    </span>
                  </td>
                  <td>{t("deviceReady.processingDetail")}</td>
                </tr>
                <tr>
                  <td>{t("privacy.storage")}</td>
                  <td>
                    <span className="state-pill state-pill-idle">
                      <span className="state-dot state-dot-idle" aria-hidden="true" />
                      {t("privacy.unknown")}
                    </span>
                  </td>
                  <td>{t("deviceReady.noBackendConfirmation")}</td>
                </tr>
                <tr>
                  <td>{t("privacy.network")}</td>
                  <td>
                    <span className="state-pill state-pill-idle">
                      <span className="state-dot state-dot-idle" aria-hidden="true" />
                      {t("privacy.unknown")}
                    </span>
                  </td>
                  <td>{t("deviceReady.noBackendConfirmation")}</td>
                </tr>
              </tbody>
            </table>
            <p className="muted privacy-table-note">{t("deviceReady.privacyNote")}</p>
          </section>
        </div>

        <div className="config-side">
          <section className="nl-card status-card">
            <h2 className="config-card-title">{t("common.systemStatus")}</h2>
            <div className="status-tiles">
              <div className="status-tile">
                <h4>{t("privacy.recording")}</h4>
                <p>{t("dashboard.inactive")}</p>
              </div>
              <div className="status-tile">
                <h4>{t("privacy.processing")}</h4>
                <p>{t("deviceReady.readyValue")}</p>
              </div>
            </div>
            <div className="status-engine">
              <ModelStatus state="LOCAL_INFERENCE_READY" />
            </div>
            <div className="status-actions">
              <Button variant="primary" onClick={onContinue}>
                {t("action.newConsult")}
              </Button>
              <Button onClick={onOpenSettings}>{t("deviceReady.advancedSettings")}</Button>
            </div>
          </section>

          <aside className="tip-card">
            <h4>{t("common.clinicalTip")}</h4>
            <p>{t("deviceReady.tipBody")}</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
