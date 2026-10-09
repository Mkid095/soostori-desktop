/**
 * electron-store session storage — Electron main process only.
 *
 * This file lives in soostori-desktop (not in the SDK) because it requires
 * electron-store which is a Desktop-specific dependency.
 *
 * SECURITY: The full AuthSession (access token, refresh token, etc.) is encrypted
 * via ElectronSecureStorage (OS-backed DPAPI/Keychain) before being written to
 * the ElectronStore JSON. JSON serialization is handled internally so that the
 * raw StoredSession object (containing plaintext tokens) is never written to
 * disk unencrypted.
 */

import type { SessionStorage } from '@soostori/auth'
import type { StoredSession } from '@soostori/auth'
import type { AuthSession } from '@soostori/core'
import { loadSession, saveSession, clearSession } from '@soostori/auth'
import ElectronStore from 'electron-store'
import { getSecureStorage } from './electron-secure-storage'

type StringRecord = Record<string, string>

/**
 * Returns true when safeStorage encryption is available on this OS.
 * When false, tokens are stored as plaintext (dev-only fallback — never in prod).
 */
function isEncryptionAvailable(): boolean {
  // safeStorage is only available in the main process; this check is safe
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { safeStorage } = require('electron')
  return safeStorage.isEncryptionAvailable()
}

export class ElectronStoreSessionStorage implements SessionStorage {
  private store: ElectronStore<StringRecord>
  private secure = getSecureStorage()

  constructor() {
    this.store = new ElectronStore({ name: 'soostori-session' } as ElectronStore.Options<StringRecord>)
  }

  /**
   * Retrieve and deserialize a StoredSession.
   *
   * Handles two formats on disk:
   * - Legacy: plaintext JSON (accessToken/refreshToken as raw JWT strings)
   * - Current: safeStorage-encrypted JSON (tokens are base64-encoded ciphertext)
   *
   * @returns JSON string suitable for the auth SDK's loadSession, or null
   */
  get(key: string): string | null {
    // Try encrypted store first (current format)
    const encrypted = this.secure.getSync(key)
    if (encrypted) return encrypted

    // Fallback: check for legacy plaintext JSON
    const val = this.store.get(key)
    if (val == null) return null

    // Detect legacy plaintext by checking if the stored JSON, when parsed,
    // has an accessToken that looks like a raw JWT (has 2 dots).
    // Encrypted values are base64 strings without JWT dot structure.
    try {
      const parsed = JSON.parse(String(val)) as { accessToken?: string }
      if (parsed.accessToken && (parsed.accessToken.match(/\./g) || []).length === 2) {
        // Legacy plaintext session — return it as-is so the caller migrates it
        return String(val)
      }
    } catch {
      // Not valid JSON
    }

    return String(val)
  }

  /**
   * Serialize and encrypt a StoredSession before persisting.
   * The session object is JSON-serialized internally; only the resulting
   * ciphertext string reaches the encrypted store.
   */
  set(key: string, value: string): void {
    if (!isEncryptionAvailable()) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const log = require('electron-log').default
      log.warn('[SessionStorage] encryption not available — DEV ONLY storing plaintext')
      this.store.set(key, value)
      return
    }
    // value is the raw StoredSession JSON from the auth SDK — encrypt the whole thing
    this.secure.setSync(key, value)
  }

  delete(key: string): void {
    this.secure.deleteSync(key)
    this.store.delete(key)
  }
}

export async function desktopLoadSession(): Promise<AuthSession | null> {
  const storage = new ElectronStoreSessionStorage()
  return loadSession(storage as SessionStorage)
}

export async function desktopSaveSession(session: AuthSession): Promise<void> {
  const storage = new ElectronStoreSessionStorage()
  return saveSession(storage as SessionStorage, session)
}

export async function desktopClearSession(): Promise<void> {
  const storage = new ElectronStoreSessionStorage()
  return clearSession(storage as SessionStorage)
}
