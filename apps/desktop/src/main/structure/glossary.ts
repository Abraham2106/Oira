/**
 * Léxico clínico español (lenguaje coloquial → término normalizado).
 * Es la costura donde luego entra un RAG vectorial; la firma es de
 * recuperación a propósito (ver docs/research/R-11-spanish-clinical-rag.md).
 */
export const GLOSSARY: Readonly<Record<string, string>> = {
  "azúcar alta": "hiperglucemia",
  "azúcar baja": "hipoglucemia",
  "presión alta": "hipertensión arterial",
  "presión baja": "hipotensión arterial",
  "colesterol alto": "hipercolesterolemia",
  "triglicéridos altos": "hipertrigliceridemia",
  "hierro bajo": "anemia ferropénica",
  "anemia": "anemia",
  "gastritis": "gastritis",
  "acidez": "reflujo gastroesofágico",
  "agruras": "pirosis",
  "estreñimiento": "estreñimiento",
  "diarrea": "diarrea",
  "gripe": "síndrome gripal",
  "resfriado": "catarro de vías respiratorias altas",
  "tos con flema": "tos productiva",
  "tos seca": "tos seca",
  "falta de aire": "disnea",
  "ahogo": "disnea",
  "silbidos en el pecho": "sibilancias",
  "ronquera": "disfonía",
  "dolor de cabeza": "cefalea",
  "jaqueca": "migraña",
  "migraña": "migraña",
  "mareo": "mareo",
  "vértigo": "vértigo",
  "desmayo": "síncope",
  "convulsión": "crisis convulsiva",
  "dolor de pecho": "dolor torácico",
  "palpitaciones": "palpitaciones",
  "hinchazón de piernas": "edema en miembros inferiores",
  "hinchazón": "edema",
  "cólico": "dolor cólico",
  "dolor de estómago": "dolor abdominal",
  "dolor de guata": "dolor abdominal",
  "náuseas": "náuseas",
  "ganas de vomitar": "náuseas",
  "vómito": "vómito",
  "quemadura de estómago": "pirosis",
  "piedra en la vesícula": "colelitiasis",
  "piedra en el riñón": "nefrolitiasis",
  "infección de orina": "infección del tracto urinario",
  "ganas de orinar": "poliuria",
  "ardor al orinar": "disuria",
  "próstata crecida": "hiperplasia prostática benigna",
  "regla irregular": "irregularidad menstrual",
  "ausencia de regla": "amenorrea",
  "menstruación dolorosa": "dismenorrea",
  "embarazo": "gestación",
  "parto": "parto",
  "cesárea": "cesárea",
  "ronquido": "roncopatía",
  "alergia": "alergia",
  "rinitis": "rinitis",
  "asma": "asma",
  "neumonía": "neumonía",
  "bronquitis": "bronquitis",
  "dolor de garganta": "odinofagia",
  "dolor de oído": "otalgia",
  "fiebre": "fiebre",
  "escalofríos": "escalofríos",
  "sudoración nocturna": "diaforesis nocturna",
  "baja de peso": "pérdida de peso",
  "subida de peso": "aumento de peso",
  "cansancio": "astenia",
  "debilidad": "debilidad muscular",
  "hormigueo": "parestesias",
  "entumecimiento": "hipoestesia",
  "dolor articular": "artralgia",
  "dolor muscular": "mialgia",
  "lumbago": "lumbalgia",
  "ciática": "ciatalgia",
  "torcedura": "esguince",
  "moretón": "hematoma",
  "roncha": "habón",
  "sarpullido": "exantema",
  "granos": "acné",
  "caspa": "descamación del cuero cabelludo",
  "caída de cabello": "alopecia",
  "insomnio": "insomnio",
  "nervios": "ansiedad",
  "depresión": "depresión",
  "ataques de pánico": "crisis de angustia",
  "tiroides lenta": "hipotiroidismo",
  "tiroides rápida": "hipertiroidismo",
  "bocio": "bocio",
  "diabetes": "diabetes mellitus",
  "gota": "gota",
  "artrosis": "artrosis",
  "artritis": "artritis",
  "osteoporosis": "osteoporosis",
  "varices": "varices",
}

export type GlossaryHit = {
  canonical: string
  matched: string
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

const INDEX: ReadonlyArray<{ needle: string; canonical: string }> =
  Object.entries(GLOSSARY)
    .map(([layman, canonical]) => ({
      needle: stripAccents(layman.toLowerCase()),
      canonical,
      layman,
    }))
    .sort((a, b) => b.needle.length - a.needle.length)
    .map(({ needle, canonical }) => ({ needle, canonical }))

export function retrieveTerms(text: string): GlossaryHit[] {
  const haystack = stripAccents(text.toLowerCase())
  const hits = new Map<string, GlossaryHit>()

  for (const { needle, canonical } of INDEX) {
    if (!haystack.includes(needle)) continue
    if (!hits.has(needle)) {
      const original = Object.keys(GLOSSARY).find(
        (layman) => stripAccents(layman.toLowerCase()) === needle,
      )
      if (original !== undefined) {
        hits.set(needle, { canonical, matched: original })
      }
    }
  }

  return [...hits.values()]
}
