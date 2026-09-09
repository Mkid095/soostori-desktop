/**
 * Notifications engine — Desktop thin adapter.
 *
 * Phase 11.2 Batch D: bridges the published @soostori/notifications Engine
 * with Electron's existing webContents.send transport. The Desktop keeps
 * its renderer IPC + desktop notification surface — this adapter routes
 * through them.
 */

import { NotificationEngine } from '@soostori/notifications'

export { NotificationEngine }

/** Renderer-event channel name used by Electron to deliver notification events. */
export const DESKTOP_NOTIFICATION_CHANNEL = 'desktop:notification:dispatched'

/**
 * Construct a NotificationEngine instance for the Desktop transport.
 *
 * Caller provides a `NotificationChannelRegistry` and a `RecipientResolver`.
 * The Desktop wires `webContents.send` for renderer surfaces and the OS
 * notification API for tray/active-window surfaces by attaching to this
 * engine's outbound channel.
 */
export function createDesktopNotificationEngine(args: {
  channels: ConstructorParameters<typeof NotificationEngine>[0]['channels']
  resolver: ConstructorParameters<typeof NotificationEngine>[0]['resolver']
}): NotificationEngine {
  return new NotificationEngine(args)
}
