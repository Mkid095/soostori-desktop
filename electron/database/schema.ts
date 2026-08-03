import { createPosTables } from './schema-pos'
import { createCommerceTables } from './schema-commerce'
import { createTransactionTables } from './schema-transactions'
import { createSyncTables } from './schema-sync'
import { seedDefaultData } from './schema-seed'
import log from 'electron-log'

export function createTables(): void {
  createPosTables()
  createCommerceTables()
  createTransactionTables()
  createSyncTables()
  seedDefaultData()
  log.info('All database tables created')
}

export { seedDefaultData }
