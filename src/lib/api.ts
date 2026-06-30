// API layer that bridges to Electron's IPC
// This replaces soostori's fetch-based api client

import type { ElectronAPI } from '../../electron/preload'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export const api = window.electronAPI?.db

export function getPlatform(): string {
  return window.electronAPI?.app?.getPlatform() || 'unknown'
}

export function isDesktop(): boolean {
  return typeof window.electronAPI !== 'undefined'
}
