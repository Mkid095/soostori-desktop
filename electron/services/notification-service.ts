/**
 * notification-service.ts — @soostori/notifications wiring for desktop.
 *
 * Architecture:
 *   Domain code → EventBus.publish(event)
 *                    ↓
 *              NotificationEngine.dispatch(event)
 *                    ↓
 *              ElectronInAppChannel.send(notification) → webContents → renderer
 *
 * Renderer uses useNotifications (already exists) which listens on
 * the soostori:notification DOM event dispatched by the preload bridge.
 */

import { EventBus, getEventBus } from '@soostori/events'
import { NotificationEngine, type RecipientResolver } from '@soostori/notifications'
import type { NotificationChannel } from '@soostori/notifications'
import { NotificationChannelRegistry } from '@soostori/notifications'
import { getMainWindow } from '../window-manager'
import { getSyncStore } from './store'
import { getShopId, getEmployeeId, getDeviceId } from './cloud-auth'
import type { SoostoriEvent } from '@soostori/events'
import log from 'electron-log'

/** Desktop's in-app notification channel — forwards to the renderer via webContents. */
class ElectronInAppChannel implements NotificationChannel {
  readonly channelName = 'in_app'

  async isEnabled(_shopId: unknown, _userId: unknown): Promise<boolean> {
    return true  // desktop always has in-app notifications enabled
  }

  async send(notification: {
    id: string
    title: string
    body: string
    priority: string
    data?: Record<string, unknown>
    createdAt: string
  }): Promise<void> {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) return
    // Dispatch as DOM event into renderer — consumed by useNotifications hook
    win.webContents.send('notification:rendered', {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      priority: notification.priority,
      data: notification.data,
      timestamp: Date.now(),
      read: false,
      createdAt: notification.createdAt,
    })
    log.info(`[NotificationService] sent: ${notification.title}`)
  }
}

/** Resolves recipients — desktop is single-shop, single-device. */
const desktopRecipientResolver: RecipientResolver = {
  async resolveRecipients(_event: SoostoriEvent): Promise<Array<{ userId: import('@soostori/core').UserId; shopId: import('@soostori/core').ShopId }>> {
    const shopId = (getShopId() || 'local') as import('@soostori/core').ShopId
    const employeeId = (getEmployeeId() || 'system') as import('@soostori/core').UserId
    return [{ userId: employeeId, shopId }]
  },
}

/** Singleton notification engine. */
let _engine: NotificationEngine | null = null

export function getNotificationEngine(): NotificationEngine {
  if (_engine) return _engine

  const registry = new NotificationChannelRegistry()
  registry.register(new ElectronInAppChannel())

  _engine = new NotificationEngine({
    channels: registry,
    resolver: desktopRecipientResolver,
  })

  log.info('[NotificationService] engine initialized')
  return _engine
}

/** Publish a domain event to the notification engine (and any other subscriber). */
export async function dispatchNotification(event: SoostoriEvent): Promise<void> {
  const engine = getNotificationEngine()
  try {
    await engine.dispatch(event)
  } catch (err) {
    log.error('[NotificationService] dispatch failed', err)
  }
}

/** Convenience: publish a raw object event without building a full envelope. */
export async function notify(
  name: string,
  payload: Record<string, unknown>,
  shopId?: string,
): Promise<void> {
  const store = getSyncStore()
  const sid = shopId || getShopId() || store.get('shopId') as string || 'local'
  const did = getDeviceId() || store.get('deviceId') as string || 'desktop'
  const uid = getEmployeeId() || store.get('employeeId') as string || 'system'

  const event: SoostoriEvent = {
    id: crypto.randomUUID(),
    name: name as SoostoriEvent['name'],
    version: 1,
    deviceId: did as SoostoriEvent['deviceId'],
    userId: uid as SoostoriEvent['userId'],
    shopId: sid as SoostoriEvent['shopId'],
    timestamp: new Date().toISOString() as SoostoriEvent['timestamp'],
    sequence: Date.now(),
    idempotencyKey: crypto.randomUUID(),
    source: 'local',
    payload,
  }

  await dispatchNotification(event)
}

/** Direct notification — builds a synthetic event and dispatches to engine. */
export async function notifyDirect(
  title: string,
  body: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
  data?: Record<string, unknown>,
): Promise<void> {
  await dispatchNotification({
    id: crypto.randomUUID(),
    name: 'system.error',
    version: 1,
    deviceId: (getDeviceId() || 'desktop') as SoostoriEvent['deviceId'],
    shopId: (getShopId() || 'local') as SoostoriEvent['shopId'],
    timestamp: new Date().toISOString() as SoostoriEvent['timestamp'],
    sequence: Date.now(),
    idempotencyKey: crypto.randomUUID(),
    source: 'local',
    payload: { title, message: body, priority, data },
  } as SoostoriEvent)
}

/** Expose event bus for direct subscription by main-process code. */
export const eventBus = getEventBus()
