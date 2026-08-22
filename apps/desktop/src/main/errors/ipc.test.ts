import { describe, expect, it } from "vitest"
import { createAppError } from "./core"
import {
  internalError,
  invalidInputError,
  notAuthenticatedError,
  toAppError,
} from "./ipc"

describe("errors/ipc", () => {
  it("builds boundary errors with stable codes", () => {
    expect(invalidInputError().code).toBe("INVALID_INPUT")
    expect(notAuthenticatedError().code).toBe("NOT_AUTHENTICATED")
    expect(internalError(new Error("x")).code).toBe("INTERNAL_ERROR")
  })

  it("preserves AppError and wraps unknown throws as INTERNAL_ERROR", () => {
    const typed = createAppError("EXPORT_FAILED", "Could not write.")
    expect(toAppError(typed)).toBe(typed)
    expect(toAppError(new Error("disk")).code).toBe("INTERNAL_ERROR")
    expect(toAppError({ code: "DATABASE_ERROR", message: "fake" }).code).toBe(
      "INTERNAL_ERROR",
    )
  })
})
