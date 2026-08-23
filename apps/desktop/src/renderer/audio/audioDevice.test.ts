import { describe, expect, it } from "vitest"
import { isBluetoothLabel, listAudioInputDevices } from "./audioDevice"

type DeviceKind = "audioinput" | "audiooutput" | "videoinput"

function fakeDevice(kind: DeviceKind, label: string, deviceId: string): MediaDeviceInfo {
  return { deviceId, kind, label, groupId: "grp", toJSON: () => ({}) } as unknown as MediaDeviceInfo
}

describe("listAudioInputDevices", () => {
  it("filtra solo entradas de audio y marca las Bluetooth", async () => {
    const devices = await listAudioInputDevices(async () => [
      fakeDevice("audioinput", "Micrófono frontal", "dev-1"),
      fakeDevice("audiooutput", "Altavoces", "dev-2"),
      fakeDevice("videoinput", "Cámara", "dev-3"),
      fakeDevice("audioinput", "Auricular Bluetooth Hands-Free", "dev-4"),
    ])
    expect(devices).toHaveLength(2)
    expect(devices[0]).toEqual({
      deviceId: "dev-1",
      label: "Micrófono frontal",
      isBluetooth: false,
    })
    expect(devices[1]?.isBluetooth).toBe(true)
  })

  it("devuelve [] cuando no hay dispositivos", async () => {
    await expect(listAudioInputDevices(async () => [])).resolves.toEqual([])
  })

  it("devuelve [] si la enumeración falla", async () => {
    const devices = await listAudioInputDevices(async () => {
      throw new Error("NotAllowedError")
    })
    expect(devices).toEqual([])
  })

  it("devuelve [] con gracia cuando falta navigator.mediaDevices", async () => {
    const devices = await listAudioInputDevices()
    expect(devices).toEqual([])
  })
})

describe("isBluetoothLabel", () => {
  it("detecta los marcadores conocidos sin distinguir mayúsculas", () => {
    expect(isBluetoothLabel("Auricular Bluetooth")).toBe(true)
    expect(isBluetoothLabel("BLUETOOTH HEADSET")).toBe(true)
    expect(isBluetoothLabel("Hands-Free Profile")).toBe(true)
    expect(isBluetoothLabel("Micrófono del auricular")).toBe(true)
    expect(isBluetoothLabel("Logitech Wireless Headset")).toBe(true)
    expect(isBluetoothLabel("Sony WF-1000XM5")).toBe(true)
    expect(isBluetoothLabel("WH-1000XM4")).toBe(true)
  })

  it("no marca dispositivos comunes", () => {
    expect(isBluetoothLabel("Micrófono integrado")).toBe(false)
    expect(isBluetoothLabel("Realtek Audio")).toBe(false)
    expect(isBluetoothLabel("")).toBe(false)
  })
})
