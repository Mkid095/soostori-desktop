/**
 * useTeam.ts — Phase 14 team management React Query hooks.
 *
 * Implements:
 * - useTeamMembers()     — list active team members
 * - useTeamInvitations() — list pending invitations
 * - useInviteTeamMember() — mutation: create invitation
 * - useUpdateTeamMember() — mutation: update role/permissions
 * - useRemoveTeamMember() — mutation: remove member
 * - useCancelInvitation() — mutation: cancel invitation
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ShopUser } from '../../electron/preload/types'

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

export interface TeamMember {
  id: string
  businessId: string
  personId: string | null
  employeeId: string
  role: string
  permissionsJson: string | null
  joinedAt: string
  employeeName?: string
}

// ── Query keys ────────────────────────────────────────────────────────────────

const TEAM_KEYS = {
  members: () => ['team', 'members'] as const,
  invitations: () => ['team', 'invitations'] as const,
}

// ── useTeamMembers ─────────────────────────────────────────────────────────────

export function useTeamMembers() {
  return useQuery({
    queryKey: TEAM_KEYS.members(),
    queryFn: async (): Promise<TeamMember[]> => {
      return await window.electronAPI.db.teamListMembers() as TeamMember[]
    },
    staleTime: 30_000,
  })
}

// ── useTeamInvitations ─────────────────────────────────────────────────────────

export function useTeamInvitations() {
  return useQuery({
    queryKey: TEAM_KEYS.invitations(),
    queryFn: async (): Promise<TeamInvitation[]> => {
      return await window.electronAPI.db.teamListInvitations() as TeamInvitation[]
    },
    staleTime: 30_000,
  })
}

// ── useInviteTeamMember ───────────────────────────────────────────────────────

export function useInviteTeamMember(authUser: ShopUser | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!authUser?.id) throw new Error('Not authenticated')
      return await window.electronAPI.db.teamInvite({
        email,
        role,
        invitedByEmployeeId: authUser.id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAM_KEYS.invitations() })
    },
  })
}

// ── useUpdateTeamMember ───────────────────────────────────────────────────────

export function useUpdateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      membershipId,
      role,
      permissions,
    }: {
      membershipId: string
      role?: string
      permissions?: string[]
    }) => {
      return await window.electronAPI.db.teamUpdateMember(membershipId, { role, permissions })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAM_KEYS.members() })
    },
  })
}

// ── useRemoveTeamMember ────────────────────────────────────────────────────────

export function useRemoveTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (membershipId: string) => {
      return await window.electronAPI.db.teamRemoveMember(membershipId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAM_KEYS.members() })
    },
  })
}

// ── useCancelInvitation ────────────────────────────────────────────────────────

export function useCancelInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      return await window.electronAPI.db.teamCancelInvitation(invitationId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAM_KEYS.invitations() })
    },
  })
}
