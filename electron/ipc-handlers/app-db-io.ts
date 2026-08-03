import { dialog, app } from 'electron'
import fs from 'fs'
import { getDatabase } from '../database'
import log from 'electron-log'

export async function exportDatabase(filePath: string): Promise<void> {
  const db = getDatabase()
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
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  log.info(`Database exported to ${filePath}`)
}

export async function importDatabase(filePath: string): Promise<void> {
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(fileContent)
  const db = getDatabase()
  const importTable = (table: string, rows: Record<string, unknown>[]) => {
    if (!rows || rows.length === 0) return
    db.prepare(`DELETE FROM ${table}`).run()
    const cols = Object.keys(rows[0])
    const placeholders = cols.map(() => '?').join(', ')
    const insert = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
    for (const row of rows) insert.run(...cols.map(c => row[c]))
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
    const { id, ...settings } = data.shopSettings as { id: string; [key: string]: unknown }
    const fields = Object.keys(settings)
    const sets = fields.map(f => `${f} = ?`).join(', ')
    db.prepare(`UPDATE shop_settings SET ${sets} WHERE id = ?`).run(...fields.map(f => settings[f]), id)
  }
  log.info(`Database imported from ${filePath}`)
  dialog.showMessageBox({ type: 'info', title: 'Import Complete', message: 'Data imported successfully.' })
}
