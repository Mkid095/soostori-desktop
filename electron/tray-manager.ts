/**
 * tray-manager.ts — Phase 17 System Tray integration.
 *
 * Creates a TrayIcon with context menu. Left-click shows the main window.
 * Right-click shows a context menu with:
 *   - Show Soostori POS
 *   - Notifications (unread count badge)
 *   - Quit
 *
 * The unread count is updated via updateBadgeCount().
 */

import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'
import log from 'electron-log'
import { getMainWindow } from './window-manager'

let _tray: Tray | null = null
let _unreadCount = 0

function trayIconPath(): string {
  // Use a simple 16x16 orange dot icon built from nativeImage
  return path.join(__dirname, '../../resources/tray-icon.png')
}

function buildContextMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show Soostori POS',
      click: () => {
        const win = getMainWindow()
        if (win && !win.isDestroyed()) {
          if (win.isMinimized()) win.restore()
          win.show()
          win.focus()
        }
      },
    },
    {
      label: 'Notifications',
      submenu: [
        {
          label: 'Open Notifications',
          click: () => {
            const win = getMainWindow()
            if (win && !win.isDestroyed()) {
              win.show()
              win.focus()
              win.webContents.send('notification:openNotifications')
            }
          },
        },
        {
          label: 'Mark All Read',
          click: () => {
            const win = getMainWindow()
            if (win && !win.isDestroyed()) {
              win.webContents.send('notification:markAllRead')
            }
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
}

export function createTray(): Tray {
  if (_tray) return _tray

  // Build a simple 16x16 orange square tray icon
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  // Fill orange: RGBA = 255, 107, 0, 255
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4 + 0] = 255   // R
    canvas[i * 4 + 1] = 107   // G
    canvas[i * 4 + 2] = 0     // B
    canvas[i * 4 + 3] = 255   // A
  }

  const icon = nativeImage.createFromBuffer(canvas, { width: size, height: size })
  _tray = new Tray(icon)
  _tray.setToolTip('Soostori POS')
  _tray.setContextMenu(buildContextMenu())

  _tray.on('click', () => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      if (win.isVisible()) {
        win.focus()
      } else {
        win.show()
      }
    }
  })

  _tray.on('right-click', () => {
    _tray?.setContextMenu(buildContextMenu())
  })

  log.info('[TrayManager] created')
  return _tray
}

export function updateTrayBadgeCount(count: number): void {
  _unreadCount = count
  if (!_tray) return

  // Update tooltip to show unread count
  _tray.setToolTip(count > 0 ? `Soostori POS — ${count} unread` : 'Soostori POS')
  _tray.setContextMenu(buildContextMenu())
}

export function destroyTray(): void {
  if (_tray) {
    _tray.destroy()
    _tray = null
  }
}

export function getTray(): Tray | null {
  return _tray
}
