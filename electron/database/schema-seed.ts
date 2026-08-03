import { getDatabase } from './index'
import log from 'electron-log'

export function seedDefaultData(): void {
  const database = getDatabase()

  const existingSettings = database.prepare('SELECT id FROM shop_settings WHERE id = ?').get('default')
  if (!existingSettings) {
    database.prepare(`INSERT INTO shop_settings (id, name, currency) VALUES ('default', 'My Shop', 'KES')`).run()
    log.info('Default shop settings created')
  }

  const existingAppSettings = database.prepare('SELECT id FROM app_settings WHERE id = ?').get('default')
  if (!existingAppSettings) {
    database.prepare(`INSERT INTO app_settings (id, default_theme, default_language, login_pin, pin_set) VALUES ('default', 'light', 'en', '0000', 0)`).run()
    log.info('Default app settings created')
  }

  const categoryCount = database.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (categoryCount.count === 0) {
    const defaultCategories = [
      { name: 'General', color: '#6366f1', icon: 'package' },
      { name: 'Food & Drinks', color: '#22c55e', icon: 'coffee' },
      { name: 'Electronics', color: '#f59e0b', icon: 'smartphone' },
      { name: 'Clothing', color: '#ec4899', icon: 'shirt' },
    ]
    const insert = database.prepare(`
      INSERT INTO categories (id, name, color, icon, display_order) VALUES (?, ?, ?, ?, ?)
    `)
    defaultCategories.forEach((cat, index) => {
      insert.run(`cat_${index + 1}`, cat.name, cat.color, cat.icon, index)
    })
    log.info('Default categories created')
  }
}
