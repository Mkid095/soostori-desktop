/**
 * desktop-cloud-auth.ts — Desktop-specific CloudAuth subclass.
 *
 * The base CloudAuth class has protected _saveStoredSession/_loadStoredSession/_clearStoredSession
 * methods that must be overridden. This subclass wires them to ElectronStoreSessionStorage
 * so sessions persist across app restarts.
 *
 * The canonical identity chain on desktop:
 *   FIDScript User ($users)
 *     ↓
 *   Shop (shops)         ← populated by syncShopFromCloud after first login
 *     ↓
 *   Employee (employees) ← populated by syncEmployeesFromCloud after first login
 *     ↓
 *   Device (devices)     ← created on first login, registered in FIDScript
 *     ↓
 *   Authorized Session   ← stored by this class via ElectronStoreSessionStorage
 */

import { CloudAuth } from '@soostori/auth'
import type { StoredSession } from '@soostori/auth'
import type { PlatformAuthAdapter, AuthApiClient } from '@soostori/auth'
import { ElectronStoreSessionStorage } from './electron-store-session'

export class DesktopCloudAuth extends CloudAuth {
  private readonly _storage = new ElectronStoreSessionStorage()

  constructor(platform: PlatformAuthAdapter, api: AuthApiClient) {
    super(platform, api)
  }

  protected override async _saveStoredSession(session: StoredSession): Promise<void> {
    await this._storage.set('soostori:session', JSON.stringify(session))
  }

  protected override async _loadStoredSession(): Promise<StoredSession | null> {
    const raw = this._storage.get('soostori:session')
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredSession
    } catch {
      return null
    }
  }

  protected override async _clearStoredSession(): Promise<void> {
    this._storage.delete('soostori:session')
  }
}
