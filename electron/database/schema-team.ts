/**
 * schema-team.ts — Phase 14 team_invitations + team_memberships tables.
 */

import { getDatabase } from './index'

export function createTeamTables(): void {
  const db = getDatabase()
  migrateTeamInvitationsTable(db)
  migrateTeamMembershipsTable(db)

  db.exec(`
    CREATE TABLE IF NOT EXISTS team_invitations (
      id                   TEXT PRIMARY KEY,
      business_id          TEXT NOT NULL,
      invited_by_employee_id TEXT NOT NULL,
      email                TEXT NOT NULL,
      role                 TEXT NOT NULL DEFAULT 'cashier',
      status               TEXT NOT NULL DEFAULT 'pending',
      expires_at           TEXT NOT NULL,
      accepted_at          TEXT,
      created_at           TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS team_memberships (
      id                    TEXT PRIMARY KEY,
      business_id           TEXT NOT NULL,
      person_id             TEXT,
      employee_id           TEXT NOT NULL,
      role                  TEXT NOT NULL DEFAULT 'cashier',
      permissions_json      TEXT,
      joined_at             TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(business_id, employee_id)
    )
  `)
}

function migrateTeamInvitationsTable(db: import('better-sqlite3').Database): void {
  const cols = db.prepare('PRAGMA table_info(team_invitations)').all() as { name: string }[]
  const existing = new Set(cols.map(c => c.name))
  if (!existing.has('invited_by_employee_id')) {
    db.exec('ALTER TABLE team_invitations ADD COLUMN invited_by_employee_id TEXT NOT NULL DEFAULT \'\' ')
  }
  if (!existing.has('business_id')) {
    db.exec('ALTER TABLE team_invitations ADD COLUMN business_id TEXT NOT NULL DEFAULT \'default\'')
  }
}

function migrateTeamMembershipsTable(db: import('better-sqlite3').Database): void {
  const cols = db.prepare('PRAGMA table_info(team_memberships)').all() as { name: string }[]
  const existing = new Set(cols.map(c => c.name))
  if (!existing.has('business_id')) {
    db.exec('ALTER TABLE team_memberships ADD COLUMN business_id TEXT NOT NULL DEFAULT \'default\'')
  }
  if (!existing.has('person_id')) {
    db.exec('ALTER TABLE team_memberships ADD COLUMN person_id TEXT')
  }
  if (!existing.has('permissions_json')) {
    db.exec('ALTER TABLE team_memberships ADD COLUMN permissions_json TEXT')
  }
}
