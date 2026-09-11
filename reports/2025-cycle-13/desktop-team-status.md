# Desktop Team Status — Phase 14

**Cycle**: 2025-cycle-13 | **Worker**: Desktop (soostori-desktop)
**Started**: 2026-09-10 | **Platform**: soostori-desktop
**SDK commit**: Pending (SDK worker is separate)

---

## Gate Status

| Gate | Status |
|------|--------|
| Desktop IPC handlers + SQLite + UI with RBAC | ✅ DONE |
| `team.*` capabilities in `usePermissions` | ✅ DONE |
| `can('team')` gates sidebar nav | ✅ DONE (sidebar already used `can('team')`) |
| Sync events on all mutations | ✅ DONE |
| CHANGELOG.md updated | ✅ DONE |
| `tsc --noEmit` (new files clean) | ✅ DONE (0 new errors) |

---

## Files Created

### `electron/database/schema-team.ts`
Phase 14 SQLite schema — `team_invitations` + `team_memberships` tables with migration support. Creates both tables with the canonical Phase 14 shape (id, business_id, invited_by_employee_id, email, role, status, expires_at, accepted_at, created_at / id, business_id, person_id, employee_id, role, permissions_json, joined_at).

### `electron/database/sync-event-builder-team.ts`
5 typed sync event builders using canonical `EntityKind` (`invitation` / `membership`):
- `buildTeamInvitationCreatedSyncEvent`
- `buildTeamInvitationAcceptedSyncEvent`
- `buildTeamInvitationExpiredSyncEvent`
- `buildTeamMemberRemovedSyncEvent`
- `buildTeamMemberRoleChangedSyncEvent`

### `electron/ipc-handlers/team-handlers.ts`
6 IPC handlers wired to `db:team:*`:
- `db:team:invite` — creates pending invitation, enqueues sync event
- `db:team:listInvitations` — returns pending invitations for active business
- `db:team:cancelInvitation` — expires invitation, enqueues sync event
- `db:team:listMembers` — returns active memberships with employee name join
- `db:team:updateMember` — updates role/permissions, enqueues sync event
- `db:team:removeMember` — removes membership, enqueues sync event

### `src/hooks/useTeam.ts`
6 React Query hooks:
- `useTeamMembers()` — query
- `useTeamInvitations()` — query
- `useInviteTeamMember()` — mutation
- `useUpdateTeamMember()` — mutation
- `useRemoveTeamMember()` — mutation
- `useCancelInvitation()` — mutation

### `src/pages/team/TeamPage.tsx`
Full Phase 14 UI with Members + Invitations tabs, capability-gated actions, role badge colors, invite modal, edit-role modal, remove confirmation.

---

## Files Modified

| File | Change |
|------|--------|
| `electron/database/schema.ts` | Added `createTeamTables()` call |
| `electron/ipc-handlers/index.ts` | Added `registerTeamHandlers` export |
| `electron/ipc-handlers/index-register.ts` | Imported and called `registerTeamHandlers()` |
| `electron/preload/ipc-signatures-db.ts` | Added 6 team IPC signatures |
| `electron/preload/handlers-db.ts` | Wired 6 team handlers via `ipcRenderer.invoke` |
| `src/lib/auth-context.tsx` | Added `ROLE_TEAM_PERMISSIONS` map |
| `src/hooks/usePermissions.ts` | Extended `can()` to check team capabilities |
| `CHANGELOG.md` | Added Phase 14 block |

---

## RBAC Summary

| Role | `team.view` | `team.invite` | `team.update` | `team.remove` | `team.assign_role` | `team.assign_permission` |
|------|-------------|---------------|---------------|---------------|--------------------|--------------------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cashier | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Attendant | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Cashier/Attendant are blocked from navigating to the Team page by the sidebar's `can('team')` check. Viewer cannot access team at all.

---

## Pending / Blocked

- **SDK `packages/team/` package**: Not created yet (SDK worker is separate). Desktop IPC handlers import `asBusinessId`, `asSyncEventId`, `asIdempotencyKey`, `asDeviceId`, `asEmployeeId` from `@soostori/core` (already available). Sync event types come from `@soostori/contracts` (already available).
- **Full integration test**: Cannot be fully verified until SDK worker creates `packages/team/` and the web/mobile workers complete their implementations.

---

## Commit

```
feat(desktop): Phase 14 — team invite, list, update, remove with RBAC + sync
```
