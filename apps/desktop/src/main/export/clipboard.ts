export type ClipboardPort = {
  writeText: (text: string) => void
}

export function createMemoryClipboard(store: { text: string } = { text: "" }): ClipboardPort {
  return {
    writeText(text) {
      store.text = text
    },
  }
}
