import { describe, expect, it } from "vitest"
import { exportFailedError, exportNotImplementedError } from "./export"
import { createExportStub } from "../export/export.service"

describe("errors/export", () => {
  it("separates not-implemented from real export failures", () => {
    expect(exportNotImplementedError().code).toBe("NOT_IMPLEMENTED")
    expect(exportFailedError(new Error("ENOSPC")).code).toBe("EXPORT_FAILED")
  })

  it("export stub never claims success", async () => {
    const port = createExportStub()
    await expect(
      port.exportNote({
        encounterId: "00000000-0000-4000-8000-000000000001",
        format: "txt",
      }),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" })
  })
})
