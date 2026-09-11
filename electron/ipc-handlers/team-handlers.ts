/**
 * team-handlers.ts — Phase 14 team management IPC handlers.
 *
 * Implements:
 * - db:team:invite          — create pending invitation
 * - db:team:listInvitations — list pending invitations for business
 * - db:team:cancelInvitation — cancel a pending invitation
 * - db:team:listMembers     — list active team members
 * - db:team:updateMember    — update role or permissions
 * - db:team:removeMember    — remove a member
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { getRealSyncEngine } from '../sync/sync-engine'
import { resolveActiveShopId } from '../database/active-shop'
import {
  buildTeamInvitationCreatedSyncEvent,
  buildTeamInvitationExpiredSyncEvent,
  buildTeamMemberRemovedSyncEvent,
  buildTeamMemberRoleChangedSyncEvent,
  type TeamSyncEventContext,
} from '../database/sync-event-builder-team'
import log from 'electron-log'
import { v4 as uuidv4 } from 'uuid'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TeamInvitation {
  id: string
  businessId: string
  invitedByEmployeeId: string
  email: string
  role: string
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

export interface TeamMembership {
  id: string
  businessId: string
  personId: string | null
  employeeId: string
  role: string
  permissionsJson: string | null
  joinedAt: string
}

export interface TeamMember extends TeamMembership {
  employeeName?: string
}

// ── Helper ────────────────────────────────────────────────────────────────────

function makeCtx(businessId: string): TeamSyncEventContext {
  return {
    businessId,
    originatingDeviceId: process.env.DEVICE_ID || 'desktop',
    originatingEmployeeId: 'system',
    clientSequence: Date.now(),
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export function registerTeamHandlers(): void {
  // ── db:team:invite ────────────────────────────────────────────────────────
  ipcMain.handle('db:team:invite', async (_event, rawData: unknown) => {
    const data = rawData as { email: string; role: string; invitedByEmployeeId: string }
    const db = getDatabase()
    const businessId = await resolveActiveShopId()
    const id = uuidv4()
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    db.prepare(`
      INSERT INTO team_invitations
        (id, business_id, invited_by_employee_id, email, role, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, businessId, data.invitedByEmployeeId, data.email, data.role || 'attendant', expiresAt, now)

    const invitation = db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(id) as TeamInvitation

    // Enqueue sync event
    try {
      const ctx = makeCtx(businessId)
      const evt = buildTeamInvitationCreatedSyncEvent(invitation, ctx)
      await getRealSyncEngine().enqueue(evt)
    } catch (e) {
      log.warn('team:invite sync event failed', e)
    }

    log.info(`team:invite — ${id} for ${data.email}`)
    return invitation
  })

  // ── db:team:listInvitations ──────────────────────────────────────────────
  ipcMain.handle('db:team:listInvitations', async () => {
    const businessId = await resolveActiveShopId()
    const rows = getDatabase().prepare(`
      SELECT id, business_id AS businessId, invited_by_employee_id AS invitedByEmployeeId,
             email, role, status, expires_at AS expiresAt,
             accepted_at AS acceptedAt, created_at AS createdAt
      FROM team_invitations
      WHERE business_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).all(businessId)
    return rows as TeamInvitation[]
  })

  // ── db:team:cancelInvitation ──────────────────────────────────────────────
  ipcMain.handle('db:team:cancelInvitation', async (_event, invitationId: string) => {
    const businessId = await resolveActiveShopId()
    const db = getDatabase()
    db.prepare(`UPDATE team_invitations SET status = 'expired' WHERE id = ? AND business_id = ?`)
      .run(invitationId, businessId)

    try {
      const ctx = makeCtx(businessId)
      const evt = buildTeamInvitationExpiredSyncEvent({ id: invitationId }, ctx)
      await getRealSyncEngine().enqueue(evt)
    } catch (e) {
      log.warn('team:cancelInvitation sync event failed', e)
    }

    log.info(`team:cancelInvitation — ${invitationId}`)
    return { success: true }
  })

  // ── db:team:listMembers ───────────────────────────────────────────────────
  ipcMain.handle('db:team:listMembers', async () => {
    const businessId = await resolveActiveShopId()
    const db = getDatabase()

    const rows = db.prepare(`
      SELECT tm.id, tm.business_id AS businessId, tm.person_id AS personId,
             tm.employee_id AS employeeId, tm.role, tm.permissions_json AS permissionsJson,
             tm.joined_at AS joinedAt,
             e.name AS employeeName
      FROM team_memberships tm
      LEFT JOIN employees e ON e.id = tm.employee_id
      WHERE tm.business_id = ?
      ORDER BY tm.joined_at DESC
    `).all(businessId)
    return rows as TeamMember[]
  })

  // ── db:team:updateMember ──────────────────────────────────────────────────
  ipcMain.handle('db:team:updateMember', async (_event, rawData: unknown) => {
    const data = rawData as { membershipId: string; role?: string; permissions?: string[] }
    const businessId = await resolveActiveShopId()
    const db = getDatabase()

    const existing = db.prepare(
      'SELECT * FROM team_memberships WHERE id = ? AND business_id = ?'
    ).get(data.membershipId, businessId) as TeamMembership | undefined
    if (!existing) throw new Error('Member not found')

    const updates: string[] = []
    const vals: unknown[] = []

    if (data.role !== undefined) {
      updates.push('role = ?')
      vals.push(data.role)
    }
    if (data.permissions !== undefined) {
      updates.push('permissions_json = ?')
      vals.push(JSON.stringify(data.permissions))
    }

    if (updates.length === 0) return existing

    vals.push(data.membershipId)
    db.prepare(`UPDATE team_memberships SET ${updates.join(', ')} WHERE id = ?`).run(...vals)

    const updated = db.prepare('SELECT * FROM team_memberships WHERE id = ?').get(data.membershipId) as TeamMembership

    try {
      const ctx = makeCtx(businessId)
      const evt = buildTeamMemberRoleChangedSyncEvent({ id: data.membershipId, role: data.role || existing.role }, ctx)
      await getRealSyncEngine().enqueue(evt)
    } catch (e) {
      log.warn('team:updateMember sync event failed', e)
    }

    log.info(`team:updateMember — ${data.membershipId}`)
    return updated
  })

  // ── db:team:removeMember ──────────────────────────────────────────────────
  ipcMain.handle('db:team:removeMember', async (_event, membershipId: string) => {
    const businessId = await resolveActiveShopId()
    const db = getDatabase()

    const existing = db.prepare(
      'SELECT * FROM team_memberships WHERE id = ? AND business_id = ?'
    ).get(membershipId, businessId) as TeamMembership | undefined
    if (!existing) throw new Error('Member not found')

    db.prepare('DELETE FROM team_memberships WHERE id = ?').run(membershipId)

    try {
      const ctx = makeCtx(businessId)
      const evt = buildTeamMemberRemovedSyncEvent({ id: membershipId, employeeId: existing.employeeId }, ctx)
      await getRealSyncEngine().enqueue(evt)
    } catch (e) {
      log.warn('team:removeMember sync event failed', e)
    }

    log.info(`team:removeMember — ${membershipId}`)
    return { success: true }
  })

  log.info('Team IPC handlers registered')
}
