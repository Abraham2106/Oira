import { describe, expect, it } from "vitest"
import { resolveBridge } from "./oira"
import type { OiraApi } from "../../shared/types/oira-api"

function stubApi(): OiraApi {
  return {
    warmTranscription: async () => ({ ok: true, data: { warmed: true } }),
    getSetupStatus: async () => ({ ok: true, data: { phase: "ready", ready: true, checks: [], models: [] } }),
    provisionModels: async () => ({ ok: true, data: { phase: "ready", ready: true, checks: [], models: [] } }),
    startEncounter: async () => ({
      ok: true,
      data: {
        encounterId: "00000000-0000-4000-8000-000000000001",
        startedAt: "2026-01-01T00:00:00.000Z",
      },
    }),
    stopEncounter: async () => ({
      ok: true,
      data: { status: "transcribing" },
    }),
    generateNote: async () => ({
      ok: false,
      error: { code: "NOT_IMPLEMENTED", message: "x", retryable: false },
    }),
    saveNote: async () => ({
      ok: false,
      error: { code: "NOT_IMPLEMENTED", message: "x", retryable: false },
    }),
    retryAudioCleanup: async () => ({
      ok: false,
      error: { code: "NOT_IMPLEMENTED", message: "x", retryable: false },
    }),
    exportNote: async () => ({ ok: true, data: { exported: true } }),
    writeClipboard: async () => ({ ok: true, data: { written: true } }),
    appendAudio: async () => ({ ok: true, data: { accepted: true } }),
    getSettings: async () => ({
      ok: true,
      data: {
        audioRetention: "until-note-approved",
        transcriptRetention: { unit: "days", value: 30 },
        noteRetention: "forever",
        sttModelId: null,
        uiLocale: "en",
      },
    }),
    saveSettings: async () => ({
      ok: false,
      error: { code: "NOT_IMPLEMENTED", message: "x", retryable: false },
    }),
    googleSignIn: async () => ({
      ok: false,
      error: { code: "NOT_IMPLEMENTED", message: "x", retryable: false },
    }),
    signOut: async () => ({ ok: true, data: { signedOut: true } }),
    getAuthSession: async () => ({
      ok: true,
      data: { authenticated: false, profile: null },
    }),
    onInferenceProgress: () => () => {},
    onModelLifecycle: () => () => {},
    onSetupProgress: () => () => {},
  }
}

describe("resolveBridge", () => {
  it("adapts a real preload API when present", async () => {
    const bridge = resolveBridge({ api: stubApi(), mode: "production" })
    const started = await bridge.startEncounter({ label: "", visitType: "" })
    expect(started.encounterId).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it("uses the mock only in test or explicit demo mode", async () => {
    const testBridge = resolveBridge({ mode: "test" })
    const started = await testBridge.startEncounter({ label: "", visitType: "" })
    expect(started.encounterId).toEqual(expect.any(String))

    const demoBridge = resolveBridge({ mode: "production", demo: true })
    await expect(
      demoBridge.startEncounter({ label: "", visitType: "" }),
    ).resolves.toMatchObject({ encounterId: expect.any(String) })
  })

  it("fails closed when preload is missing outside test/demo", () => {
    expect(() => resolveBridge({ mode: "production" })).toThrow(/preload is missing/)
    expect(() => resolveBridge({ mode: "development" })).toThrow(/preload is missing/)
  })
})
