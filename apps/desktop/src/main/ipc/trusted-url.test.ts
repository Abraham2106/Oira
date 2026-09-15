import { describe, expect, it } from "vitest"
import {
  canonicalDocumentUrl,
  isAllowedRendererNavigation,
  isSameTrustedDocument,
} from "./trusted-url"

describe("canonicalDocumentUrl", () => {
  it("equates the Vite origin with and without a trailing slash", () => {
    expect(canonicalDocumentUrl("http://localhost:5173")).toBe("http://localhost:5173/")
    expect(canonicalDocumentUrl("http://localhost:5173/")).toBe("http://localhost:5173/")
  })
})

describe("isSameTrustedDocument", () => {
  it("accepts the electron-vite dev URL Chromium reports after load", () => {
    expect(isSameTrustedDocument("http://localhost:5173", "http://localhost:5173/")).toBe(true)
  })

  it("rejects a different origin", () => {
    expect(isSameTrustedDocument("http://localhost:5173/", "http://localhost:5174/")).toBe(false)
  })
})

describe("isAllowedRendererNavigation", () => {
  it("allows same-origin Vite navigation in development", () => {
    expect(isAllowedRendererNavigation("http://localhost:5173/", "http://localhost:5173")).toBe(true)
  })

  it("rejects a packaged file document navigating to http", () => {
    expect(
      isAllowedRendererNavigation(
        "https://example.test/",
        "file:///C:/app/dist/renderer/index.html",
      ),
    ).toBe(false)
  })
})
