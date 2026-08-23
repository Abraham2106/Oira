import { describe, expect, it } from "vitest"
import { GLOSSARY, retrieveTerms } from "./glossary"

describe("main/structure/glossary", () => {
  it("encuentra términos coloquiales sin distinguir mayúsculas ni acentos", () => {
    const hits = retrieveTerms("Paciente refiere PRESION ALTA de larga evolución.")

    expect(hits).toEqual([{ canonical: "hipertensión arterial", matched: "presión alta" }])
  })

  it("devuelve varios términos cuando aplican", () => {
    const canonicals = retrieveTerms("azúcar alta y dolor de cabeza").map((hit) => hit.canonical)

    expect(canonicals).toContain("hiperglucemia")
    expect(canonicals).toContain("cefalea")
  })

  it("devuelve vacío cuando no hay coincidencias", () => {
    expect(retrieveTerms("consulta de rutina")).toEqual([])
  })

  it("mantiene el léxico con entradas canónicas", () => {
    expect(Object.keys(GLOSSARY).length).toBeGreaterThanOrEqual(60)
  })
})
