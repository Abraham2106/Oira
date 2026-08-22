export type IpcHandle = (
  channel: string,
  listener: (event: unknown, raw: unknown) => unknown,
) => void
