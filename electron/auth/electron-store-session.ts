/**
 * electron-store session storage — Electron main process only.
 *
 * This file lives in soostori-desktop (not in the SDK) because it requires
 * electron-store which is a Desktop-specific dependency.
 */

import type { SessionStorage } from '@soostori/auth'
import type { AuthSession } from '@soostori/core'
import { loadSession, saveSession, clearSession } from '@soostori/auth'
import ElectronStore from 'electron-store'

type StringRecord = Record<string, string>

export class ElectronStoreSessionStorage implements SessionStorage {
  private store: ElectronStore<StringRecord>

  constructor() {
    this.store = new ElectronStore({ name: 'soostori-session' } as ElectronStore.Options<StringRecord>)
  }

  get(key: string): string | null {
    const val = this.store.get(key)
    if (val == null) return null
    return String(val)
  }

  set(key: string, value: string): void {
    this.store.set(key, value)
  }

  delete(key: string): void {
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
