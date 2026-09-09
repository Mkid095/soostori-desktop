/**
 * Desktop notification dispatch — production wiring.
 *
 * Phase 11.2 Finalization: completes the wiring between
 * @soostori/notifications.NotificationEngine and the Electron renderer
 * surface via the desktop:notification:dispatched IPC channel.
 *
 * Flow:
 *
 *   Domain event
 *   → @soostori/events EventBus
 *   → NotificationEngine.attach()
 *   → DesktopNotificationDispatcher
 *   → Electron BrowserWindow.webContents.send(DESKTOP_NOTIFICATION_CHANNEL)
 */

import type { Notification, NotificationChannel } from '@soostori/notifications'
import { NotificationChannelRegistry } from '@soostori/notifications'
import type { ShopId, UserId } from '@soostori/core'

import { DESKTOP_NOTIFICATION_CHANNEL } from '../canonical/notifications-engine'

interface ElectronGlobal {
  BrowserWindow?: {
    getAllWindows(): Array<{ webContents: { isDestroyed(): boolean; send(channel: string, payload: unknown): void } }>
  }
}

/**
 * Desktop-side notification channel — bridges the SDK NotificationEngine
 * to Electron's main → renderer IPC.
 *
 * Captures the `globalThis.BrowserWindow` interface so the module can run
 * in environments that lack Electron (e.g., test runners).
 */
export class DesktopNotificationChannel implements NotificationChannel {
  readonly channelName = 'desktop'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly electron: any = (globalThis as { BrowserWindow?: any }).BrowserWindow) {}

  async isEnabled(_shopId: ShopId, _recipientId: UserId): Promise<boolean> {
    return this.electron?.getAllWindows != null
  }

  async send(notification: Notification): Promise<void> {
    if (!this.electron?.getAllWindows) return
    for (const window of this.electron.getAllWindows()) {
      try {
        if (!window.webContents.isDestroyed()) {
          window.webContents.send(DESKTOP_NOTIFICATION_CHANNEL, notification)
        }
      } catch (err) {
        // ignore individual-window send failures
        void err
      }
    }
  }
}

/**
 * Registry factory — single-channel Desktop registry.
 */
export function createDesktopChannelRegistry(): NotificationChannelRegistry {
  const desktop = new DesktopNotificationChannel()
  const registry = new NotificationChannelRegistry()
  registry.register(desktop)
  return registry
}

/**
 * Test capture sink — records dispatch calls for the production-path
 * test. Keeps the same call signature as DesktopNotificationChannel so it
 * is transparent to NotificationEngine.
 */
export class InMemoryNotificationChannel implements NotificationChannel {
  readonly channelName = 'in-memory'
  readonly sent: Notification[] = []
  async isEnabled(_shopId: ShopId, _recipientId: UserId): Promise<boolean> {
    return true
  }
  async send(notification: Notification): Promise<void> {
    this.sent.push(notification)
  }
}

void (globalThis as unknown as ElectronGlobal)
