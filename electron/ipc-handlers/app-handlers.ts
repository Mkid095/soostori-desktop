import { ipcMain, BrowserWindow, dialog, app } from 'electron'
import log from 'electron-log'
import path from 'path'
import fs from 'fs'
import { getDatabase } from '../database'

export function registerAppHandlers(): void {
  // ========== APP INFO ==========

  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })

  // ========== WINDOW MANAGEMENT ==========

  ipcMain.on('app:window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.minimize()
  })

  ipcMain.on('app:window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on('app:window:close', () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.close()
  })

  ipcMain.handle('app:window:isMaximized', () => {
    const win = BrowserWindow.getFocusedWindow()
    return win?.isMaximized() || false
  })

  // Listen for maximize/unmaximize events
  ipcMain.on('app:window:listenMaximize', (event) => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.on('maximize', () => {
        event.reply('app:window:maximizeChange', true)
      })
      win.on('unmaximize', () => {
        event.reply('app:window:maximizeChange', false)
      })
    }
  })

  // ========== DIALOGS ==========

  ipcMain.handle('app:dialog:save', async (_event, options: any) => {
    const result = await dialog.showSaveDialog({
      title: options.title || 'Save File',
      defaultPath: options.defaultPath || '',
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('app:dialog:open', async (_event, options: any) => {
    const result = await dialog.showOpenDialog({
      title: options.title || 'Open File',
      defaultPath: options.defaultPath || '',
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
      properties: options.properties || ['openFile'],
    })
    return result.canceled ? null : result.filePaths
  })

  // ========== DATABASE EXPORT/IMPORT (JSON) ==========

  ipcMain.handle('app:db:export', async (event, filePath: string) => {
    try {
      const db = getDatabase()

      // Read all data from every table
      const data = {
        exportedAt: new Date().toISOString(),
        version: app.getVersion(),
        shopSettings: db.prepare('SELECT * FROM shop_settings WHERE id = ?').get('default'),
        categories: db.prepare('SELECT * FROM categories').all(),
        products: db.prepare('SELECT * FROM products').all(),
        customers: db.prepare('SELECT * FROM customers').all(),
        debts: db.prepare('SELECT * FROM debts').all(),
        sales: db.prepare('SELECT * FROM sales').all(),
        saleItems: db.prepare('SELECT * FROM sale_items').all(),
        heldSales: db.prepare('SELECT * FROM held_sales').all(),
        stockMovements: db.prepare('SELECT * FROM stock_movements').all(),
      }

      // Write as formatted JSON
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      log.info(`Database exported to ${filePath}`)
    } catch (error) {
      log.error('Failed to export database:', error)
      throw error
    }
  })

  ipcMain.handle('app:db:import', async (event, filePath: string) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(fileContent)
      const db = getDatabase()

      // Import each table — wrap in transaction
      const importTable = (table: string, rows: any[]) => {
        if (!rows || rows.length === 0) return
        db.prepare(`DELETE FROM ${table}`).run()
        const cols = Object.keys(rows[0])
        const placeholders = cols.map(() => '?').join(', ')
        const insert = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
        for (const row of rows) {
          insert.run(...cols.map(c => row[c]))
        }
      }

      importTable('categories', data.categories)
      importTable('products', data.products)
      importTable('customers', data.customers)
      importTable('debts', data.debts)
      importTable('sales', data.sales)
      importTable('sale_items', data.saleItems)
      importTable('held_sales', data.heldSales)
      importTable('stock_movements', data.stockMovements)

      if (data.shopSettings) {
        const { id, ...settings } = data.shopSettings
        const fields = Object.keys(settings)
        const sets = fields.map(f => `${f} = ?`).join(', ')
        db.prepare(`UPDATE shop_settings SET ${sets} WHERE id = ?`).run(...fields.map(f => settings[f]), id)
      }

      log.info(`Database imported from ${filePath}`)
      dialog.showMessageBox({
        type: 'info',
        title: 'Import Complete',
        message: 'Data imported successfully.',
      })
    } catch (error) {
      log.error('Failed to import database:', error)
      throw error
    }
  })

  log.info('App IPC handlers registered')
}
