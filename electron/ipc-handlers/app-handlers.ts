import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import fs from 'fs'
import log from 'electron-log'
import { exportDatabase, importDatabase } from './app-db-io'

export function registerAppHandlers(): void {
  // APP INFO
  ipcMain.handle('app:version', () => app.getVersion())

  // WINDOW MANAGEMENT
  ipcMain.on('app:window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize())
  ipcMain.on('app:window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.on('app:window:close', () => BrowserWindow.getFocusedWindow()?.close())
  ipcMain.handle('app:window:isMaximized', () => BrowserWindow.getFocusedWindow()?.isMaximized() ?? false)
  ipcMain.on('app:window:listenMaximize', event => {
    const win = BrowserWindow.getFocusedWindow()
    win?.on('maximize', () => event.reply('app:window:maximizeChange', true))
    win?.on('unmaximize', () => event.reply('app:window:maximizeChange', false))
  })

  // DIALOGS
  ipcMain.handle('app:dialog:save', async (_event, options: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showSaveDialog({ title: options.title || 'Save File', defaultPath: options.defaultPath || '', filters: options.filters || [{ name: 'All Files', extensions: ['*'] }] })
    return result.canceled ? null : result.filePath
  })
  ipcMain.handle('app:dialog:open', async (_event, options: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[]; properties?: string[] }) => {
    const result = await dialog.showOpenDialog({ title: options.title || 'Open File', defaultPath: options.defaultPath || '', filters: options.filters || [{ name: 'All Files', extensions: ['*'] }], properties: (options.properties || ['openFile']) as ('openFile' | 'multiSelections')[] })
    return result.canceled ? null : result.filePaths
  })

  // DATABASE EXPORT/IMPORT
  ipcMain.handle('app:db:export', async (_event, filePath: string) => {
    try { await exportDatabase(filePath) }
    catch (error) { log.error('Export failed:', error); throw error }
  })
  ipcMain.handle('app:db:import', async (_event, filePath: string) => {
    try { await importDatabase(filePath) }
    catch (error) { log.error('Import failed:', error); throw error }
  })

  // FILE WRITE
  ipcMain.handle('app:file:write', async (_event, filePath: string, content: string) => {
    try { fs.writeFileSync(filePath, content, 'utf-8') }
    catch (error) { log.error('Write file failed:', error); throw error }
  })

  log.info('App IPC handlers registered')
}
