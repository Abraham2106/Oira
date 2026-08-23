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
        data: { transcript: [], note },
      }),
      saveNote: async () => ({
        ok: true,
        data: { noteId: "00000000-0000-4000-8000-000000000002" },
      }),
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
        ok: true,
        data: {
          audioRetention: "until-note-approved",
          transcriptRetention: { unit: "days", value: 30 },
          noteRetention: "forever",
          sttModelId: null,
          uiLocale: "es",
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
    }

    const bridge = adaptOiraApi(api)
    const started = await bridge.startEncounter({ label: "", visitType: "" })
    expect(started.encounterId).toBe(encounterId)
    await bridge.stopEncounter(encounterId)
    const generated = await bridge.generateNote(encounterId)
    expect(Object.keys(generated.note.sections).sort()).toEqual([...SECTION_IDS].sort())
    await bridge.saveNote(encounterId, generated.note)
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
      saveNote: async () => ({
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
    }

    await expect(
      adaptOiraApi(api).startEncounter({ label: "", visitType: "" }),
    ).rejects.toThrow("The request was not valid.")
  })
})
