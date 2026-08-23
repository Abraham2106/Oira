import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

const KEY_LENGTH = 32
const SALT_LENGTH = 16
const SCRYPT = { N: 16_384, r: 8, p: 1 } as const

export type StoredPinHash = {
  v: 1
  alg: "scrypt"
  N: number
  r: number
  p: number
  keylen: number
  salt: string
  hash: string
}

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
  let stored: StoredPinHash
  try {
    stored = JSON.parse(serialized) as StoredPinHash
  } catch {
    return false
  }
  if (
    stored.v !== 1 ||
    stored.alg !== "scrypt" ||
    typeof stored.salt !== "string" ||
    typeof stored.hash !== "string" ||
    typeof stored.N !== "number" ||
    typeof stored.r !== "number" ||
    typeof stored.p !== "number" ||
    typeof stored.keylen !== "number"
  ) {
    return false
  }

  const salt = Buffer.from(stored.salt, "base64")
  const expected = Buffer.from(stored.hash, "base64")
  if (salt.length === 0 || expected.length === 0) return false

  const actual = scryptSync(pin, salt, stored.keylen, {
    N: stored.N,
    r: stored.r,
    p: stored.p,
  })
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
