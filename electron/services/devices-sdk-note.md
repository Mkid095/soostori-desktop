# `@soostori/devices` SDK Integration — Gap Analysis

> Phase 11 audit — September 2026

---

## What exists

**`electron/sdk/primary-coordinator.ts`** already wires `@soostori/devices` into the desktop:

- `initPrimaryCoordinator()` — boots `PrimaryDeviceCoordinator` with correct thresholds (15s stale, 60s lost)
- `ingestPrimaryHeartbeat()` — feeds remote device heartbeats into the coordinator
- `tickPrimaryCoordinator()` — called every 1s to drive staleness detection
- `setHostMode()` — marks local device as LAN primary
- `getPrimaryStatus()` / `getAuthorityStatus()` — canonical accessors consumed by `sale-orchestrator.ts`, `inventory-orchestrator.ts`, and `sync-service.ts`

**`electron/ipc-handlers/device-handlers.ts`** owns the raw SQL:

- `devices` table: register, list, heartbeat, set host
- `device_pairings` table: request, approve, reject, get token
- `db:devices:getPrimaryState` — inline staleness logic (15s/60s thresholds) duplicated from the SDK coordinator

---

## Gap 1: `db:devices:getPrimaryState` handler

The IPC handler at `device-handlers.ts:113-129` reimplements the same `online/stale/lost` logic as `primary-coordinator.ts:getPrimaryStatus()`. This is redundant — the coordinator is already initialized by the time this handler runs.

**Phase 2 fix** (minimal, ~15 lines):
```typescript
// Replace handler body with a call to the already-initialized coordinator:
ipcMain.handle('db:devices:getPrimaryState', (_event, shopId: string) => {
  const ps = getPrimaryStatus()  // from electron/sdk/primary-coordinator
  return {
    primaryId: ps.primaryId ?? null,
    electedAt: ps.electedAt ?? null,
    lastHeartbeatAt: ps.lastHeartbeatAt ?? null,
    stalenessMs: ps.stalenessMs,
    status: ps.status,
    electionPending: ps.electionPending,
    canAuthorStockOps: ps.canAuthorStockOps,
  }
})
```
**Precondition**: `initPrimaryCoordinator()` must be called during app startup before any renderer process requests this state. That ordering is already the case in `main.ts` (cloud-auth initialization sequence).

**Risk**: Low. Behavior is identical; `getPrimaryStatus()` uses the same 15s/60s thresholds.

---

## Gap 2: Device pairing — no SDK surface

`device_pairings` table operations (`requestPairing`, `approvePairing`, `rejectPairing`, `getPairings`, `getConnectionToken`) have **no equivalent in `@soostori/devices`**. This is a LAN-proprietary flow:
- A device requests to join a shop LAN
- Owner approves from another device
- A `connection_token` is issued and stored on the device row

This pairing state machine lives only in `device-handlers.ts` and must remain as raw SQL. The `@soostori/devices` SDK has no concept of device pairing.

---

## Gap 3: `DevicesRepository` is an interface, not an implementation

`DevicesRepository` in the SDK is an abstract interface. It cannot replace `device-handlers.ts` SQL calls without a concrete implementation backed by SQLite. Phase 2 would require:

1. Implement `DevicesRepository` backed by the existing `devices` table
2. Inject it into `@soostori/devices` at initialization time
3. Remove the SQL-based handlers and replace with SDK calls

This is a **non-trivial refactor** (estimated 150-200 lines across multiple files) and should be its own Phase 2 task.

---

## Summary

| Concern | SDK coverage | Phase 2 action |
|---|---|---|
| Primary/heartbeat staleness logic | Already wired via `primary-coordinator.ts` | Replace `getPrimaryState` handler body |
| Device pairing flow | No SDK surface | Keep as-is in `device-handlers.ts` |
| Device CRUD (register, list, heartbeat, set host) | Interface only, no SQLite impl | Phase 2 full repo implementation |
| `cloud-auth.ts` device identity | No overlap — session-only | None |

**Only the `getPrimaryState` handler is a quick win** — ~15 lines, same behavior, calls existing `primary-coordinator.ts` adapter. The rest is a full Phase 2 refactor.
