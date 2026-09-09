/**
 * app-window.ts — BrowserWindow creation and lifecycle.
 * Extracted from main.ts per ANPAS (≤150 lines per file).
 */

import { app, BrowserWindow, dialog } from 'electron'
import path from 'path'
import log from 'electron-log'

let _window: BrowserWindow | null = null

export function createMainWindow(): BrowserWindow {
  _window = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 700,
    title: 'Soostori POS', frame: false, titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
    show: false,
  })

  _window.on('maximize', () => _window?.webContents.send('app:window:maximizeChange', true))
  _window.on('unmaximize', () => _window?.webContents.send('app:window:maximizeChange', false))
  _window.once('ready-to-show', () => { _window?.show(); log.info('Main window shown') })

  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    _window.loadURL(process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173')
    _window.webContents.openDevTools()
  } else {
    _window.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  _window.on('closed', () => { _window = null })
  return _window
}

export function getMainWindow(): BrowserWindow | null { return _window }
