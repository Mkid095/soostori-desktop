# PHASE 2 — BUSINESS & ACCOUNT PROVISIONING
## Application Brief — Desktop
**For**: Desktop agent
**Status**: 🔵 START
**SDK acceptance**: `PHASE-02-BUSINESS-ACCEPTANCE.md` (SDK commit `656f599`)

---

## SDK packages updated

| Package | New Version | Action |
|---------|-------------|--------|
| `@soostori/business` | `^0.1.0-alpha.2` | Update |
| `@soostori/team` | `^0.1.0-alpha.3` | Update |
| `@soostori/subscription` | `^0.1.0-alpha.2` | Update |
| `@soostori/devices` | `^0.1.0-alpha.2` | Update |
| `@soostori/cloud` | `^0.1.0-alpha.5` | Update |
| `@soostori/events` | `^0.1.0-alpha.2` | Update |

---

## PART A — SDK VERSION UPDATE

In `package.json`, update all these to the new versions above, then run `pnpm install`.

---

## PART B — DESKTOP-SPECIFIC AUDIT

### B1 — Verify CloudClient provisioning methods

**Read**: `electron/services/cloud-client.ts` (or wherever Desktop uses CloudClient)

Desktop now has access to the new `CloudClient` methods from `@soostori/cloud@0.1.0-alpha.5`:

```
createShop(name, slug, taxRate, currency, ownerPersonId)
createEmployee(shopId, personId, name, email, role)
createInvitation(shopId, email, employeeRole, code)
acceptInvitation(invitationId, idempotencyKey)
registerDevice(shopId, deviceName, deviceType)
querySubscriptions(shopId)
queryDevices(shopId)
```

Verify these are callable from Desktop's IPC bridge. If Desktop calls these via IPC handlers, verify the IPC handlers expose them.

### B2 — Business creation flow

**Read**: `electron/services/` — find business setup or onboarding flow

After Phase 1 auth, the onboarding wizard must:
1. Call `createShop()` with business name, slug, tax rate, currency
2. Create owner employee record with role `owner`
3. Bootstrap subscription (free/trial plan)
4. Register this device via `registerDevice()`

Find the onboarding/setup code and audit it against this sequence.

### B3 — Invitation flow

**Read**: `electron/services/` — find team/invitation flow

Desktop must implement:
- Generate 6-digit invite code (or use one from cloud)
- Create invitation via `createInvitation()`
- Accept invitation via `acceptInvitation()` — atomically updates invitation + creates employee

Audit whether Desktop has an invitation flow and if it uses the new SDK methods.

### B4 — Subscription enforcement

**Read**: `electron/services/cloud-auth.ts` or `electron/services/cloud-subscription.ts`

Verify that subscription entitlement is checked:
- On business creation: subscription bootstrapped as `trialing`
- On device registration: `DeviceLimitExceededError` is caught and surfaced to UI
- On offline expiry: POS operations blocked after 3-day grace period

### B5 — Active business context

Desktop supports switching between multiple businesses. Verify:
- `setActiveBusiness()` called when user selects a different business
- All subsequent cloud queries use the active business context
- `getActiveBusiness()` returns the current active business

### B6 — Role-based UI

**Read**: UI components that show/hide features based on role

Verify that UI correctly hides/shows based on `employee.role` from the SDK (`owner`, `manager`, `cashier`, `attendant`, `viewer`).

---

## PART C — TEST REQUIREMENT

After changes:

```bash
npx vitest run electron/services/canonical/__tests__/
```

All tests must pass.

---

## PART D — COMMIT AND PUSH

```bash
git add .
git commit -m "fix(business): update @soostori packages to alpha.2+, audit business provisioning flows"
git push origin main
```

---

## OUTPUT

Produce `PHASE-02-DESKTOP-AUDIT-REPORT.md` in the Desktop root.
