import { describe, expect, it } from "vitest"
import { SECTION_IDS } from "@notalocal/types"
import type { NotaLocalAPI } from "../../shared/types/notalocal-api"
import { adaptNotaLocalApi } from "./ipc"
import { syntheticNote } from "./mock"

describe("adaptNotaLocalApi", () => {
  it("unwraps Result ok payloads into the DemoBridge shape", async () => {
    const encounterId = "00000000-0000-4000-8000-000000000001"
    const note = syntheticNote()
    const api: NotaLocalAPI = {
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
    }

    const bridge = adaptNotaLocalApi(api)
    const started = await bridge.startEncounter({ label: "", visitType: "" })
    expect(started.encounterId).toBe(encounterId)
    await bridge.stopEncounter(encounterId)
    const generated = await bridge.generateNote(encounterId)
    expect(Object.keys(generated.note.sections).sort()).toEqual([...SECTION_IDS].sort())
    await bridge.saveNote(encounterId, generated.note)
  })

  it("throws on Result error", async () => {
    const api: NotaLocalAPI = {
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
    }

    await expect(
      adaptNotaLocalApi(api).startEncounter({ label: "", visitType: "" }),
    ).rejects.toThrow("The request was not valid.")
  })
})
