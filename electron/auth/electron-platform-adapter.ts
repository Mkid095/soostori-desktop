/**
 * electron-platform-adapter.ts
 *
 * Electron/Node implementation of PlatformAuthAdapter for @soostori/auth CloudAuth.
 *
 * Provides:
 * - openOAuthBrowser(url): opens system browser via shell.openExternal
 * - getSecureStorage(): returns ElectronSecureStorage singleton
 * - getNetworkStatus(): reads navigator.onLine via IPC from renderer
 * - randomString(byteLength): uses Node crypto.randomBytes
 */

import { shell } from 'electron'
import { randomBytes } from 'crypto'
import type { PlatformAuthAdapter, SecureStorage, NetworkStatus } from '@soostori/auth'
import { getSecureStorage, ElectronSecureStorage } from './electron-secure-storage'

let _networkStatus: NetworkStatus = { isOnline: true }
let _rendererOnlineHandler: (() => void) | null = null

/**
 * Update the cached network status.
 * Called by the renderer process via IPC when online/offline events fire.
 */
export function setNetworkStatus(isOnline: boolean): void {
  _networkStatus = { isOnline }
}

/**
 * ElectronPlatformAuthAdapter — implements the PlatformAuthAdapter contract
 * required by @soostori/auth CloudAuth.
 */
export class ElectronPlatformAuthAdapter implements PlatformAuthAdapter {
  private _secureStorage: ElectronSecureStorage | null = null

  /**
   * Opens the system browser for Google OAuth PKCE flow.
   * Uses Electron's shell which opens the URL in the default browser.
   */
  async openOAuthBrowser(url: string): Promise<void> {
    // Defer to next tick to let Electron finish current event processing
    await new Promise(resolve => setImmediate(resolve))
    await shell.openExternal(url)
  }

  /**
   * Returns the OS-backed secure storage singleton.
   * Tokens are encrypted with OS user credentials via Electron safe-storage.
   */
  getSecureStorage(): SecureStorage {
    if (!this._secureStorage) {
      this._secureStorage = getSecureStorage()
    }
    return this._secureStorage
  }

  /**
   * Returns current network connectivity status.
   * Status is updated via setNetworkStatus() called from the renderer
   * when navigator.onLine changes.
   */
  getNetworkStatus(): NetworkStatus {
    return _networkStatus
  }

  /**
   * Generate a cryptographically random string for OAuth PKCE state/challenge.
   * Uses Node crypto.randomBytes — safe for security-sensitive use.
   */
  randomString(byteLength: number): string {
    return randomBytes(byteLength).toString('base64url')
  }
}

// Singleton
let _adapter: ElectronPlatformAuthAdapter | null = null

export function getPlatformAdapter(): ElectronPlatformAuthAdapter {
  if (!_adapter) {
    _adapter = new ElectronPlatformAuthAdapter()
  }
  return _adapter
}
