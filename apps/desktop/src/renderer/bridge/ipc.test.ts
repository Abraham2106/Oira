import { describe, expect, it } from "vitest"
import { SECTION_IDS } from "@oira/types"
import type { OiraApi } from "../../shared/types/oira-api"
import { adaptOiraApi } from "./ipc"
import { syntheticNote } from "./mock"

describe("adaptOiraApi", () => {
  it("unwraps Result ok payloads into the DemoBridge shape", async () => {
    const encounterId = "00000000-0000-4000-8000-000000000001"
    const note = syntheticNote()
    const api: OiraApi = {
      warmTranscription: async () => ({ ok: true, data: { warmed: true } }),
      getSetupStatus: async () => ({ ok: true, data: { phase: "ready", ready: true, checks: [], models: [], runtime: { inference: "local", remoteAiProvider: "none", networkUsage: "model_downloads_only" } } }),
      provisionModels: async () => ({ ok: true, data: { phase: "ready", ready: true, checks: [], models: [], runtime: { inference: "local", remoteAiProvider: "none", networkUsage: "model_downloads_only" } } }),
      startEncounter: async () => ({
        ok: true,
        data: { encounterId, startedAt: "2026-01-01T00:00:00.000Z" },
      }),
      stopEncounter: async () => ({
        ok: true,
        data: { status: "transcribing" },
      }),
      generateNote: async () => ({
        ok: true,
        data: { status: "READY", transcript: [], note },
      }),
      retryAudioCleanup: async () => ({ ok: true, data: { cleaned: true } }),
      saveNote: async () => ({
        ok: true,
        data: { status: "SAVED", noteId: "00000000-0000-4000-8000-000000000002" },
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
          gpuPreference: "dedicated",
        },
      }),
      saveSettings: async () => ({
        ok: true,
        data: {
          audioRetention: "until-note-approved",
          transcriptRetention: { unit: "days", value: 30 },
          noteRetention: "forever",
          sttModelId: null,
          uiLocale: "es",
          gpuPreference: "dedicated",
        },
      }),
      googleSignIn: async () => ({
        ok: true,
        data: {
          subject: "s1",
          email: "d@example.com",
          displayName: "Demo Physician",
          pictureUrl: null,
        },
      }),
      signOut: async () => ({ ok: true, data: { signedOut: true } }),
      getAuthSession: async () => ({
        ok: true,
        data: { authenticated: true, profile: null },
      }),
      onInferenceProgress: () => () => {},
      onModelLifecycle: () => () => {},
      onSetupProgress: () => () => {},
    }

    const bridge = adaptOiraApi(api)
    const started = await bridge.startEncounter({ label: "", visitType: "" })
    expect(started.encounterId).toBe(encounterId)
    await bridge.stopEncounter(encounterId)
    const generated = await bridge.generateNote(encounterId)
    expect(generated.status).toBe("READY")
    if (generated.status !== "READY") return
    expect(Object.keys(generated.note.sections).sort()).toEqual([...SECTION_IDS].sort())
    await bridge.saveNote(encounterId, generated.note, true)
    await bridge.exportNote(encounterId, "txt")
    await bridge.writeClipboard("preview")
    await bridge.appendAudio({ encounterId, sequence: 0, pcm: [0, 0] })
    expect((await bridge.getSettings()).uiLocale).toBe("en")
    expect((await bridge.saveSettings({ uiLocale: "es" })).uiLocale).toBe("es")
    const profile = await bridge.googleSignIn()
    expect(profile.email).toBe("d@example.com")
    await bridge.signOut()
    expect((await bridge.getAuthSession()).authenticated).toBe(true)
    const stop = bridge.onInferenceProgress(() => {})
    stop()
  })

  it("throws on Result error", async () => {
    const api: OiraApi = {
      warmTranscription: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      getSetupStatus: async () => ({ ok: false, error: { code: "INVALID_INPUT", message: "x", retryable: false } }),
      provisionModels: async () => ({ ok: false, error: { code: "INVALID_INPUT", message: "x", retryable: false } }),
      startEncounter: async () => ({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "The request was not valid.",
          retryable: false,
        },
      }),
      stopEncounter: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      generateNote: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      retryAudioCleanup: async () => ({ ok: true, data: { cleaned: true } }),
      saveNote: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      exportNote: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      writeClipboard: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      appendAudio: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      getSettings: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      saveSettings: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      googleSignIn: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      signOut: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      getAuthSession: async () => ({
        ok: false,
        error: { code: "INVALID_INPUT", message: "x", retryable: false },
      }),
      onInferenceProgress: () => () => {},
      onModelLifecycle: () => () => {},
      onSetupProgress: () => () => {},
    }

    await expect(
      adaptOiraApi(api).startEncounter({ label: "", visitType: "" }),
    ).rejects.toThrow("The request was not valid.")
  })
})
