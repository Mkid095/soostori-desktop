/**
 * TeamPage.tsx — Phase 14 Team Management UI.
 *
 * Tabs: Members | Invitations
 * All actions gated by team.* capabilities.
 * Cashier/Attendant are redirected to POS by sidebar RBAC (can('team')).
 */

import React, { useState } from 'react'
import { RefreshCw, Plus, Pencil, Trash2, X, UserPlus, Mail, Clock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import {
  useTeamMembers,
  useTeamInvitations,
  useInviteTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
  useCancelInvitation,
  type TeamMember,
  type TeamInvitation,
} from '../../hooks/useTeam'

const ROLES = ['owner', 'manager', 'cashier', 'attendant', 'viewer'] as const
type Role = typeof ROLES[number]

const ROLE_COLORS: Record<Role, string> = {
  owner:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cashier:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  attendant:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  viewer:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const r = role.toLowerCase() as Role
  const color = ROLE_COLORS[r] ?? ROLE_COLORS.viewer
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${color}`}>
      {role}
    </span>
  )
}

const RoleSelect: React.FC<{
  value: string
  onChange: (r: string) => void
  disabled?: boolean
}> = ({ value, onChange, disabled }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs disabled:opacity-50"
  >
    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
  </select>
)

// ── Invite Modal ──────────────────────────────────────────────────────────────

const InviteModal: React.FC<{
  onClose: () => void
  onSuccess: () => void
}> = ({ onClose, onSuccess }) => {
  const { user } = useAuth()
  const invite = useInviteTeamMember(user)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('attendant')
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    if (!email.trim()) { setErr('Email required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Valid email required'); return }
    try {
      await invite.mutateAsync({ email: email.trim(), role })
      onSuccess()
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <UserPlus size={15} /> Invite Member
          </h3>
          <button onClick={onClose}><X size={15} className="text-slate-400" /></button>
        </div>
        <div className="space-y-2.5">
          <div className="relative">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@email.com"
              type="email"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
            />
          </div>
          <div className="relative">
            <ShieldCheck size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold dark:border-slate-600">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={invite.isPending}
            className="flex-1 py-2 rounded-xl bg-brand-orange text-white text-xs font-semibold disabled:opacity-50"
          >
            {invite.isPending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Member Modal ─────────────────────────────────────────────────────────

const EditMemberModal: React.FC<{
  member: TeamMember
  onClose: () => void
}> = ({ member, onClose }) => {
  const update = useUpdateTeamMember()
  const [role, setRole] = useState(member.role)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    try {
      await update.mutateAsync({ membershipId: member.id, role })
      onClose()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Change Role</h3>
          <button onClick={onClose}><X size={15} className="text-slate-400" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-3">{member.employeeName ?? member.employeeId}</p>
        <RoleSelect value={role} onChange={setRole} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold dark:border-slate-600">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={update.isPending}
            className="flex-1 py-2 rounded-xl bg-brand-orange text-white text-xs font-semibold disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Members Section ────────────────────────────────────────────────────────────

const MembersSection: React.FC<{ canInvite: boolean; canUpdate: boolean; canRemove: boolean }> = ({
  canInvite, canUpdate, canRemove,
}) => {
  const { data: members, isLoading, refetch } = useTeamMembers()
  const update = useUpdateTeamMember()
  const remove = useRemoveTeamMember()
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null)
  const [showInvite, setShowInvite] = useState(false)

  const handleRemove = (m: TeamMember) => {
    if (!confirm(`Remove ${m.employeeName ?? m.employeeId}?`)) return
    remove.mutate(m.id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Members</h2>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {canInvite && (
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-orange text-white text-xs font-semibold">
              <Plus size={13} /> Invite
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-xs text-slate-400 text-center py-4">Loading…</p>}
      {!isLoading && (!members || members.length === 0) && (
        <p className="text-xs text-slate-400 text-center py-4">No members yet.</p>
      )}

      {(members ?? []).map(m => (
        <div key={m.id}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <div className="w-7 h-7 rounded-full bg-brand-orange/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-brand-orange">
              {(m.employeeName ?? m.employeeId).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{m.employeeName ?? m.employeeId}</p>
            <p className="text-slate-400 truncate text-[10px]">
              Joined {new Date(m.joinedAt).toLocaleDateString()}
            </p>
          </div>
          <RoleBadge role={m.role} />
          {canUpdate && (
            <button onClick={() => setEditTarget(m)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <Pencil size={13} className="text-slate-400" />
            </button>
          )}
          {canRemove && (
            <button onClick={() => handleRemove(m)}
              className="p-1.5 rounded-lg hover:bg-red-50">
              <Trash2 size={13} className="text-red-400" />
            </button>
          )}
        </div>
      ))}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={() => refetch()} />}
      {editTarget && <EditMemberModal member={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  )
}

// ── Invitations Section ────────────────────────────────────────────────────────

const InvitationsSection: React.FC<{ canInvite: boolean }> = ({ canInvite }) => {
  const { data: invitations, isLoading, refetch } = useTeamInvitations()
  const cancel = useCancelInvitation()
  const [showInvite, setShowInvite] = useState(false)

  const handleCancel = (inv: TeamInvitation) => {
    if (!confirm(`Cancel invitation for ${inv.email}?`)) return
    cancel.mutate(inv.id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Invitations</h2>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {canInvite && (
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-orange text-white text-xs font-semibold">
              <Plus size={13} /> Invite
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-xs text-slate-400 text-center py-4">Loading…</p>}
      {!isLoading && (!invitations || invitations.length === 0) && (
        <p className="text-xs text-slate-400 text-center py-4">No pending invitations.</p>
      )}

      {(invitations ?? []).map(inv => {
        const expires = new Date(inv.expiresAt)
        const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return (
          <div key={inv.id}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Mail size={13} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{inv.email}</p>
              <p className="text-slate-400 truncate text-[10px] flex items-center gap-1">
                <Clock size={10} /> Sent {new Date(inv.createdAt).toLocaleDateString()}
                {daysLeft <= 2 && <span className="text-orange-500 font-semibold ml-1">{daysLeft}d left</span>}
              </p>
            </div>
            <RoleBadge role={inv.role} />
            <button onClick={() => handleCancel(inv)}
              className="p-1.5 rounded-lg hover:bg-red-50">
              <X size={13} className="text-red-400" />
            </button>
          </div>
        )
      })}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={() => refetch()} />}
    </div>
  )
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

type Tab = 'members' | 'invitations'

// ── TeamPage ──────────────────────────────────────────────────────────────────

const TeamPage: React.FC = () => {
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('members')

  const canView = can('team.view')
  const canInvite = can('team.invite')
  const canUpdate = can('team.update')
  const canRemove = can('team.remove')

  if (!canView) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-slate-400">No access to team management.</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary dark:bg-bg-primary flex flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-border-color dark:border-slate-700">
        <button onClick={() => setTab('members')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'members'
              ? 'text-brand-orange border-b-2 border-brand-orange'
              : 'text-slate-400 hover:text-slate-600'
          }`}>
          Members
        </button>
        <button onClick={() => setTab('invitations')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'invitations'
              ? 'text-brand-orange border-b-2 border-brand-orange'
              : 'text-slate-400 hover:text-slate-600'
          }`}>
          Invitations
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'members'
          ? <MembersSection canInvite={canInvite} canUpdate={canUpdate} canRemove={canRemove} />
          : <InvitationsSection canInvite={canInvite} />
        }
      </div>
    </div>
  )
}

export default TeamPage
