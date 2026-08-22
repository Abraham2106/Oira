import { describe, expect, it } from "vitest"
import { sanitizeEncounterId, sanitizeMeta } from "./redact"

describe("logging/redact", () => {
  it("keeps allow-listed scalars and drops everything else", () => {
    expect(
      sanitizeMeta({
        segments: 12,
        retryable: true,
        format: "txt",
        diagnosis: "angina inestable",
        segmentsText: "dolor torácico",
      }),
    ).toEqual({ segments: 12, retryable: true, format: "txt" })
  })

  it("allows string values only from the declared closed set", () => {
    expect(sanitizeMeta({ format: "pdf" })).toBeUndefined()
    expect(sanitizeMeta({ format: "dolor torácico" })).toBeUndefined()
    expect(sanitizeMeta({ format: "json" })).toEqual({ format: "json" })
  })

  it("rejects wrong types for allow-listed keys", () => {
    expect(sanitizeMeta({ segments: "many" })).toBeUndefined()
    expect(sanitizeMeta({ retryable: "yes" })).toBeUndefined()
    expect(sanitizeMeta({ segments: Number.NaN })).toBeUndefined()
  })

  it("accepts only UUIDs as encounter ids", () => {
    expect(sanitizeEncounterId("0f1c8f4e-1c3a-4c2b-9f7d-2b6a5c4d3e2f")).toBe(
      "0f1c8f4e-1c3a-4c2b-9f7d-2b6a5c4d3e2f",
    )
    expect(sanitizeEncounterId("maria-gonzalez")).toBeUndefined()
    expect(sanitizeEncounterId(undefined)).toBeUndefined()
  })
})
