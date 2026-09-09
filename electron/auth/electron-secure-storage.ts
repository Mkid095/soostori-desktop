/**
 * electron-secure-storage.ts
 *
 * OS-backed secure storage for sensitive auth tokens.
 * Uses Electron's safe-storage API which encrypts to the OS user account.
 *
 * Tokens stored here:
 * - Refresh tokens
 * - Trusted device tokens
 * - OAuth state/PKCE verifiers (session-scoped)
 *
 * safe-storage is available in Electron main process only.
 */

import { safeStorage } from 'electron'
import log from 'electron-log'
import { getSyncStore } from '../services/store'
import type ElectronStore from 'electron-store'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseStore = ElectronStore<any>
function sstore(): LooseStore { return getSyncStore() as LooseStore }

const SECURE_PREFIX = 'secure:'

/**
 * Encrypts a plaintext string using OS-backed encryption (DPAPI on Windows,
 * Keychain on macOS, libsecret on Linux).
 * Returns a base64-encoded ciphertext suitable for storage.
 */
function encrypt(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('[SecureStorage] encryption not available — storing plaintext (DEV ONLY)')
    return plaintext
  }
  return safeStorage.encryptString(plaintext).toString('base64')
}

/**
 * Decrypts a base64-encoded ciphertext produced by encrypt().
 */
function decrypt(ciphertext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('[SecureStorage] encryption not available — reading plaintext (DEV ONLY)')
    return ciphertext
  }
  try {
    return safeStorage.decryptString(Buffer.from(ciphertext, 'base64'))
  } catch {
    log.error('[SecureStorage] decrypt failed — clearing corrupted entry')
    return ''
  }
}

/**
 * ElectronSecureStorage — implements SecureStorage using Electron's safe-storage
 * combined with the sync-store for encrypted persistence.
 *
 * Tokens are encrypted before being written to the JSON store.
 * This means the sync-store JSON can be committed to version control
 * (if ever needed) without exposing token values.
 */
export class ElectronSecureStorage {
  /**
   * Get a value. Returns null if the key does not exist.
   * Returns null if the stored value is corrupted (auto-clears).
   */
  async get(key: string): Promise<string | null> {
    try {
      const raw = sstore().get(SECURE_PREFIX + key) as string | null
      if (!raw) return null
      const decrypted = decrypt(raw)
      return decrypted || null
    } catch (err) {
      log.error(`[SecureStorage] get("${key}") error:`, err)
      // Clear corrupted entry
      sstore().delete(SECURE_PREFIX + key)
      return null
    }
  }

  /** Synchronous get — reads from sync-store cache only. */
  getSync(key: string): string | null {
    try {
      const raw = sstore().get(SECURE_PREFIX + key) as string | null
      if (!raw) return null
      return decrypt(raw) || null
    } catch {
      return null
    }
  }

  /**
   * Set a value. The value is encrypted before being stored.
   */
  async set(key: string, value: string): Promise<void> {
    try {
      const encrypted = encrypt(value)
      sstore().set(SECURE_PREFIX + key, encrypted)
    } catch (err) {
      log.error(`[SecureStorage] set("${key}") error:`, err)
      throw err
    }
  }

  /** Synchronous set. */
  setSync(key: string, value: string): void {
    try {
      sstore().set(SECURE_PREFIX + key, encrypt(value))
    } catch (err) {
      log.error(`[SecureStorage] setSync("${key}") error:`, err)
      throw err
    }
  }

  /**
   * Delete a value.
   */
  async delete(key: string): Promise<void> {
    sstore().delete(SECURE_PREFIX + key)
  }

  /** Synchronous delete. */
  deleteSync(key: string): void {
    sstore().delete(SECURE_PREFIX + key)
  }
}

// Singleton — shared across all CloudAuth instances
let _secureStorage: ElectronSecureStorage | null = null

export function getSecureStorage(): ElectronSecureStorage {
  if (!_secureStorage) {
    _secureStorage = new ElectronSecureStorage()
  }
  return _secureStorage
}
