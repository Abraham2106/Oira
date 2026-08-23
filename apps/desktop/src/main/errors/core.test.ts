import { describe, expect, it } from "vitest"
import { createAppError, isAppError, toSerializableError } from "./core"

describe("errors/core", () => {
  it("brands AppError and accepts only known codes", () => {
    const error = createAppError("INVALID_INPUT", "Bad request.")
    expect(error.name).toBe("OiraAppError")
    expect(isAppError(error)).toBe(true)
  })

  it("rejects duck-typed objects without brand or known code", () => {
    expect(
      isAppError({ code: "DATABASE_ERROR", message: "looks real" }),
    ).toBe(false)
    expect(
      isAppError({
        name: "OiraAppError",
        code: "NOT_A_REAL_CODE",
        message: "nope",
      }),
    ).toBe(false)
  })

  it("strips cause when serializing for IPC", () => {
    const error = createAppError("INTERNAL_ERROR", "Failed.", {
      cause: new Error("/secret/path"),
    })
    expect(toSerializableError(error)).toEqual({
      code: "INTERNAL_ERROR",
      message: "Failed.",
      hint: undefined,
      retryable: false,
    })
  })
})
