export type StructuringPort = {
  complete: (input: { prompt: string; transcriptText: string }) => Promise<string>
}
