/**
 * sync-event-builder-team.ts — Phase 14 team sync event builders.
 *
 * ANPAS: ≤150 lines per block.
 */

import { v4 as uuidv4 } from 'uuid'
import { asBusinessId, asSyncEventId, asIdempotencyKey,
  asDeviceId, asEmployeeId } from '@soostori/core'
import type { SyncEvent } from '@soostori/contracts'

export interface TeamSyncEventContext {
  businessId: string
  originatingDeviceId: string
  originatingEmployeeId: string
  clientSequence: number
}

export const buildTeamInvitationCreatedSyncEvent = (
  invitation: { id: string; email: string; role: string; status: string },
  ctx: TeamSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`team.invitation.created:${invitation.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'invitation',
  entityId: invitation.id,
  operation: 'create',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: 1,
  payload: invitation as unknown as Record<string, unknown>,
  state: 'pending',
})

export const buildTeamInvitationAcceptedSyncEvent = (
  invitation: { id: string },
  ctx: TeamSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`team.invitation.accepted:${invitation.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'invitation',
  entityId: invitation.id,
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: 2,
  payload: { ...invitation, status: 'accepted' } as Record<string, unknown>,
  state: 'pending',
})

export const buildTeamInvitationExpiredSyncEvent = (
  invitation: { id: string },
  ctx: TeamSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`team.invitation.expired:${invitation.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'invitation',
  entityId: invitation.id,
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: 2,
  payload: { ...invitation, status: 'expired' } as Record<string, unknown>,
  state: 'pending',
})

export const buildTeamMemberRemovedSyncEvent = (
  member: { id: string; employeeId: string },
  ctx: TeamSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`team.member.removed:${member.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'membership',
  entityId: member.id,
  operation: 'delete',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: Date.now(),
  payload: member as unknown as Record<string, unknown>,
  state: 'pending',
})

export const buildTeamMemberRoleChangedSyncEvent = (
  member: { id: string; role: string },
  ctx: TeamSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`team.member.role_changed:${member.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'membership',
  entityId: member.id,
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: Date.now(),
  payload: member as unknown as Record<string, unknown>,
  state: 'pending',
})
