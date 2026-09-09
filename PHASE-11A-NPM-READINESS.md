# Phase 11A — SDK npm Release Preparation Report

> Status: **Audit complete (corrected). Dry-run ready. NOT published. Awaiting license decision.**

---

## ⚠️ Correction to Earlier Audit

The initial deep audit reported 20 packages total. A second-pass filesystem enumeration found **5 additional package.json files** at `packages/business/{sales,products,customers,debts}/package.json`.

**Correct total: 25 packages**, with 23 publishable candidates. Earlier claims about `@soostori/sales` / `@soostori/products` "not existing" were incorrect — they DO exist as independent packages under the `business/` directory tree.

---

## Complete Package Inventory (Filesystem-Verified)

### Public Candidates (23 packages, `private: false`)

| # | Package | Internal deps |
|---|---------|---------------|
| 1 | `@soostori/core` | (none — leaf) |
| 2 | `@soostori/events` | core |
| 3 | `@soostori/schema` | core |
| 4 | `@soostori/auth` | core |
| 5 | `@soostori/devices` | core, events |
| 6 | `@soostori/inventory` | core, events |
| 7 | `@soostori/lan` | core, events, devices |
| 8 | `@soostori/storage` | core |
| 9 | `@soostori/offline` | core, events |
| 10 | `@soostori/notifications` | core, events |
| 11 | `@soostori/audit` | core, events |
| 12 | `@soostori/payments` | core, events |
| 13 | `@soostori/whatsapp` | core, events |
| 14 | `@soostori/cloud` | core, schema |
| 15 | `@soostori/sync` | core, schema |
| 16 | `@soostori/subscription` | core |
| 17 | `@soostori/tuma` | core |
| 18 | `@soostori/business` | core, events |
| 19 | `@soostori/sales` | core, events, products |
| 20 | `@soostori/products` | core, events |
| 21 | `@soostori/customers` | core, events |
| 22 | `@soostori/debts` | core, events |

### Private (correctly excluded — 2 packages)

| Package | Reason |
|---------|--------|
| `@soostori/contract-tests` | `private: true`, no exports, internal test harness |
| `@soostori/desktop-adapter` | `private: true`, depends on `better-sqlite3` (Electron-only) |

### Not in SDK

- `@soostori/contracts` — exists in Web's local `packages/contracts/` only. Not an SDK package.

---

## Inter-Package Dependency Graph (Complete)

```
Tier 0 (zero internal deps):
  core

Tier 1 (depend only on core):
  events, schema, auth, subscription, storage, tuma

Tier 2 (depend on core + events/schema):
  devices, inventory, business, products, customers, debts,
  audit, payments, notifications, offline, whatsapp,
  cloud, sync

Tier 3 (depend on Tier 2):
  sales (depends on products)

Tier 4:
  lan (depends on devices)
```

**Publication order must follow topological order.** Publishing `@soostori/sales` before `@soostori/products` would fail because `sales` requires `products`.

---

## Pre-Publish Blockers (Corrected)

### 🔴 Blocker 1 — `workspace:*` references (40+ instances)

The corrected count: 23 publishable packages, 21 with workspace deps. Total ~40 `workspace:*` references.

The 4 new sub-packages (sales, products, customers, debts) all use `workspace:*` for `core`, `events`, and (in sales' case) `products`.

**Resolution:** Pre-publish rewrite script that converts `workspace:*` → `0.1.0-alpha.1` for all internal deps.

### 🔴 Blocker 2 — License is `UNLICENSED` in all 23 packages

Same as before. **Decision required from user.**

### 🟢 Resolved — Sales/Products/Customers/Debts DO exist

Previously flagged as a blocker. Resolved: these are 4 independent top-level packages nested under `packages/business/`. No topology changes needed. **Topology B confirmed viable.**

### 🟡 Blocker 3 — No `repository` field in any package

Not a hard blocker but should be added. Recommend `https://github.com/<owner>/soostori-sdk`.

### 🟡 Blocker 4 — No `peerDependencies`

`zod` is bundled at `^3.24.0` in every package. External consumers can't share their own zod. Recommendation: declare `zod` as a `peerDependency` with version range and remove from regular `dependencies` for packages where zod is only used in types/validation interfaces.

---

## Verification That Desktop tsconfig Path Resolution Works

Desktop's `tsconfig.json` paths:
```json
"@soostori/sales":     "packages/business/sales/src/index.ts"
"@soostori/products":  "packages/business/products/src/index.ts"
```

These resolve correctly to the actual sub-package source files. Desktop's `@soostori/business` import would resolve to `packages/business/src/index.ts`.

**No tsconfig changes required** to consume these packages. The tsconfig already points to the correct files.

---

## Mechanical Pre-Publish Checklist

| # | Action | Status |
|---|--------|--------|
| 1 | License metadata — **DECISION BLOCKED on user** | Pending |
| 2 | Rewrite `workspace:*` → `0.1.0-alpha.1` | Ready to execute |
| 3 | Bump version → `0.1.0-alpha.1` in all 23 packages | Ready to execute |
| 4 | Add `repository` field | Ready to execute |
| 5 | Add `peerDependencies: { zod: "^3.24.0" }` to applicable packages | Ready to execute |
| 6 | Confirm exports map for all packages includes ESM + CJS where required | Already done in 18 packages; needs verification for 5 new ones |
| 7 | Build all 23 packages via `pnpm -r build` | Ready to execute |
| 8 | `pnpm pack` each package | Ready to execute |
| 9 | Inspect each tarball for leakage (tests, dev files, secrets) | Ready to execute |
| 10 | Create external consumer project OUTSIDE monorepo | Ready to execute |
| 11 | Install packed tarballs into external consumer | Ready to execute |
| 12 | Verify public imports work in ESM mode | Ready to execute |
| 13 | Verify public imports work in CJS mode (where supported) | Ready to execute |
| 14 | Verify transitive deps resolve correctly | Ready to execute |
| 15 | Verify no monorepo path aliases required | Ready to execute |
| 16 | Run SDK regression suite | Ready to execute |
| 17 | Final dry-run report | Ready after above |

---

## What Will NOT Happen

- ❌ No `npm publish`, `pnpm publish`, `pnpm -r publish`
- ❌ No license changes (stays `UNLICENSED`)
- ❌ No domain behavior changes
- ❌ No Phase 9.2 / Phase 10 changes

---

## What Requires Your Decision Before Publication

1. **License type** — MIT / Apache 2.0 / BSL / Proprietary / UNLICENSED-with-private-registry
2. **Repository URL** for the `repository` field

Until those decisions are made, this phase remains in dry-run / audit mode.

---

## Recommended Next Action

Run the mechanical pre-publish checklist (items 2-17 above) as a **dry-run only**. Produce the final dry-run report showing exactly what would be published, then await license decision before any actual `npm publish` is invoked.
