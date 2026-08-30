import { pbkdf2Sync, randomBytes } from 'crypto'

export function hashPin(pin: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex')
  return { hash, salt }
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  return pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex') === hash
}
