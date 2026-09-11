import { createPosTables } from './schema-pos'
import { createCommerceTables } from './schema-commerce'
import { createTransactionTables } from './schema-transactions'
import { createSyncTables } from './schema-sync'
import { createTeamTables } from './schema-team'
import { createNotificationTables } from './schema-notifications'
import { seedDefaultData } from './schema-seed'
import log from 'electron-log'

export function createTables(): void {
  createPosTables()
  createCommerceTables()
  createTransactionTables()
  createSyncTables()
  createTeamTables()
  createNotificationTables()
  seedDefaultData()
  log.info('All database tables created')
}

export { seedDefaultData }
