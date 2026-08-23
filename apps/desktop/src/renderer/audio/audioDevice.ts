export type AudioDeviceInfo = {
  deviceId: string
  label: string
  isBluetooth: boolean
}

const BLUETOOTH_MARKERS = [
  "bluetooth",
  "hands-free",
  "auricular",
  "wireless",
  "wf-",
  "wh-1000",
]

export function isBluetoothLabel(label: string): boolean {
  const normalized = label.toLowerCase()
  return BLUETOOTH_MARKERS.some((marker) => normalized.includes(marker))
}

/**
 * Lista dispositivos de entrada de audio. Si el entorno no expone la API de
 * medios (o la enumeración falla), devuelve [] en lugar de romper la pantalla.
 */
export async function listAudioInputDevices(
  enumerate: () => Promise<MediaDeviceInfo[]> = defaultEnumerate,
): Promise<AudioDeviceInfo[]> {
  let devices: MediaDeviceInfo[]
  try {
    devices = await enumerate()
  } catch {
    return []
  }
  return devices
    .filter((device) => device.kind === "audioinput")
    .map((device) => ({
      deviceId: device.deviceId,
      label: device.label,
      isBluetooth: isBluetoothLabel(device.label),
    }))
}

async function defaultEnumerate(): Promise<MediaDeviceInfo[]> {
  const mediaDevices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices
  if (!mediaDevices || typeof mediaDevices.enumerateDevices !== "function") {
    return []
  }
  return mediaDevices.enumerateDevices()
}
