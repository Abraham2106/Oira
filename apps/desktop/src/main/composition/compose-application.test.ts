import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { composeApplication } from "./compose-application"
import { createSilentIpcLogger } from "../ipc/withValidation"
import { createAudioTempStore } from "../audio"
import { createMockTranscription } from "../inference/mock"
import { createHeuristicStructuring } from "../structure/heuristic-structuring"
import { createMemoryNoteStore } from "../storage/memory.store"

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("composeApplication", () => {
  it("wires start → capture → generate → save through swapped adapters", async () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "oira-hex-"))
    dirs.push(audioTempDir)
    const audio = createAudioTempStore({ audioTempDir })
    const notesStore = createMemoryNoteStore()
    const exportDir = join(audioTempDir, "exports")
    const app = composeApplication(createSilentIpcLogger(), {
      audio,
      notesStore,
      exportDir,
      transcription: createMockTranscription(),
      structuring: createHeuristicStructuring(),
    })

    const started = await app.encounters.start({ label: "hex" })
    audio.append(started.encounterId, Buffer.alloc(320), 0)
    await app.encounters.stop(started.encounterId)
    expect(existsSync(join(audioTempDir, started.encounterId, "capture.wav"))).toBe(
      true,
    )

    const generated = await app.notes.generate(started.encounterId)
    expect(generated.status).toBe("READY")
    if (generated.status !== "READY") return
    expect(generated.transcript).toHaveLength(3)
    expect(Object.keys(generated.note.sections)).toHaveLength(7)
    expect(existsSync(join(audioTempDir, started.encounterId))).toBe(false)

    const saved = await app.notes.save({
      encounterId: started.encounterId,
      note: generated.note,
      clinicianConfirmed: true,
    })
    const stored = await notesStore.get(saved.noteId)
    expect(stored?.encounterId).toBe(started.encounterId)
    expect(stored?.label).toBe("hex")
    expect(stored?.transcript).toHaveLength(3)
    expect(stored?.note.sections.visit_context.presence).toBe("STATED")

    await expect(
      app.exportNote.exportNote({
        encounterId: started.encounterId,
        format: "txt",
      }),
    ).resolves.toEqual({ exported: true })
    expect(
      readFileSync(
        join(exportDir, `${started.encounterId}.txt`),
        "utf8",
      ),
    ).toContain("No consta en la consulta.")
  })

  it("keeps the mock inference adapter as the test default", async () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "oira-hex-mock-"))
    dirs.push(audioTempDir)
    const app = composeApplication(createSilentIpcLogger(), {
      audio: createAudioTempStore({ audioTempDir }),
    })
    const started = await app.encounters.start({})
    app.audio.append(started.encounterId, Buffer.alloc(320), 0)
    await app.encounters.stop(started.encounterId)
    const generated = await app.notes.generate(started.encounterId)
    expect(generated.transcript).toHaveLength(3)
  })

  it("authenticates clinical IPC by default under test", () => {
    const app = composeApplication(createSilentIpcLogger())
    expect(app.session.isAuthenticated()).toBe(true)
  })
})
