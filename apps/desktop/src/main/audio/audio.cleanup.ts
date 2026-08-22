import { removeEncounterAudioDir } from "./audio.temp"

export async function cleanupEncounterAudio(
  audioTempDir: string,
  encounterId: string,
): Promise<void> {
  await removeEncounterAudioDir(audioTempDir, encounterId)
}
