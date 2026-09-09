import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'
import { createTables, seedDefaultData } from './schema'
import { runMigrations } from './migrations'
import { runSdkAlignmentMigration } from './schema-9-1-migration'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function setDatabase(newDb: Database.Database): void {
  db = newDb
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'soostori.db')
  log.info(`Database path: ${dbPath}`)

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  runMigrations()
  runSdkAlignmentMigration()
  seedDefaultData()
}

export { createTables, seedDefaultData }
