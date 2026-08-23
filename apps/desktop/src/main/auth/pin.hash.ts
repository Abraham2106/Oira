import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { z } from "zod"

const KEY_LENGTH = 32
const SALT_LENGTH = 16
const SCRYPT = { N: 16_384, r: 8, p: 1 } as const

const storedPinHashSchema = z
  .object({
    v: z.literal(1),
    alg: z.literal("scrypt"),
    N: z.number().int().positive(),
    r: z.number().int().positive(),
    p: z.number().int().positive(),
    keylen: z.number().int().positive(),
    salt: z.string().min(1),
    hash: z.string().min(1),
  })
  .strict()

export type StoredPinHash = z.infer<typeof storedPinHashSchema>

export function hashPin(pin: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const hash = scryptSync(pin, salt, KEY_LENGTH, SCRYPT)
  const stored: StoredPinHash = {
    v: 1,
    alg: "scrypt",
    ...SCRYPT,
    keylen: KEY_LENGTH,
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
  }
  return JSON.stringify(stored)
}

export function verifyPin(pin: string, serialized: string): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized) as unknown
  } catch {
    return false
  }
  const stored = storedPinHashSchema.safeParse(parsed)
  if (!stored.success) return false
  const record = stored.data

  const salt = Buffer.from(record.salt, "base64")
  const expected = Buffer.from(record.hash, "base64")
  if (salt.length === 0 || expected.length === 0) return false

  const actual = scryptSync(pin, salt, record.keylen, {
    N: record.N,
    r: record.r,
    p: record.p,
  })
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
