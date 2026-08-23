import { mkdir, rm } from "node:fs/promises"
import { createAppError } from "../utils/app-error"
import { safeJoin } from "../utils/safe-join"

const ENCOUNTER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const PCM_FILENAME = "pcm.s16le"
export const WAV_FILENAME = "capture.wav"

export function assertEncounterId(encounterId: string): void {
  if (!ENCOUNTER_ID_RE.test(encounterId)) {
    throw createAppError("INVALID_INPUT", "The request was not valid.", {
      retryable: false,
    })
  }
}

export function encounterAudioDir(
  audioTempDir: string,
  encounterId: string,
): string {
  assertEncounterId(encounterId)
  return safeJoin(audioTempDir, encounterId)
}

export function encounterPcmPath(
  audioTempDir: string,
  encounterId: string,
): string {
  return safeJoin(encounterAudioDir(audioTempDir, encounterId), PCM_FILENAME)
}

export function encounterWavPath(
  audioTempDir: string,
  encounterId: string,
): string {
  return safeJoin(encounterAudioDir(audioTempDir, encounterId), WAV_FILENAME)
}

export async function ensureEncounterAudioDir(
  audioTempDir: string,
  encounterId: string,
): Promise<string> {
  const dir = encounterAudioDir(audioTempDir, encounterId)
  // POSIX 0700. Windows ignores mode; do not invent ACL equivalence (R-6).
  await mkdir(dir, { recursive: true, mode: 0o700 })
  return dir
}

export async function removeEncounterAudioDir(
  audioTempDir: string,
  encounterId: string,
): Promise<void> {
  const dir = encounterAudioDir(audioTempDir, encounterId)
  await rm(dir, { recursive: true, force: true })
}
