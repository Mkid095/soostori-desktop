# PHASE 1 — DESKTOP AUTHENTICATION AUDIT
## Application Brief — Desktop
**For**: Desktop agent
**Status**: 🔵 AUDIT IN PROGRESS
**Based on**: PHASE-01-SDK-AUDIT-REPORT.md (SDK agent, commit dc8c7f7)

---

## Context

The SDK agent has completed Phase 1 fixes. `@soostori/auth@0.1.0-alpha.7` is published.

**What changed in the SDK**:
- `StoredSession` now correctly populated with `employeeId`, `shopId`, `deviceId` from API responses (GAP-01/02/03 fixed)
- `beginEnrollment()` now returns `enrollmentToken` from `verifyPinForEnrollment()` to enable cross-device enrollment (GAP-04 fixed)
- 144/144 tests passing
- Web export verified sufficient (GAP-05 ✓, GAP-06 ✓)

**Desktop's current SDK version**: `^0.1.0-alpha.6` — update to `^0.1.0-alpha.7`

---

## PART A — SDK VERSION UPDATE

### A1 — Update `@soostori/auth` version

In `package.json`, update:

```diff
- "@soostori/auth": "^0.1.0-alpha.6",
+ "@soostori/auth": "^0.1.0-alpha.7",
```

Run `npm install` to update the lockfile.

---

## PART B — DESKTOP-SPECIFIC AUDIT

### B1 — Verify StoredSession consumption

**Read**: `electron/auth/desktop-cloud-auth.ts`, `electron/services/cloud-auth.ts`

The SDK now populates `StoredSession` with `employeeId`, `shopId`, `deviceId` from API responses (previously always `''`).

Verify Desktop's `_loadStoredSession()` correctly loads these fields from ElectronStore.

Verify that after `restoreSession()`, Desktop's auth context has access to `session.employeeId`, `session.shopId`, `session.deviceId`.

If Desktop stores a separate session object (not `StoredSession`), audit it for missing fields.

### B2 — Verify cross-device enrollment IPC bridge

**Read**: `electron/auth/desktop-operational-auth.ts`, `electron/ipc-handlers/cloud-auth-handlers.ts`

GAP-04 fixed: `beginEnrollment()` now returns `enrollmentToken` from `verifyPinForEnrollment()`.

Verify the Desktop IPC bridge exposes `beginEnrollment()` correctly so the renderer can:
1. Call `beginEnrollment()` with `pinVerificationProof`
2. Receive `enrollmentToken` in the result
3. Pass it to `completeEnrollmentWithCloudVerify()`

If the IPC handler discards `enrollmentToken`, fix it.

### B3 — Verify identity chain after sign-in

**Read**: `electron/services/cloud-auth.ts` or similar

After `exchangeGoogleCode` or `signInWithIdToken` succeeds, Desktop must:
1. `syncShopFromCloud()` — populate local `shops` table
2. `syncEmployeesFromCloud()` — populate local `employees` table
3. `registerDevice()` — ensure `devices` table has this device record

Verify these are called. If any step is missing, implement it.

### B4 — Verify Google OAuth PKCE flow

**Read**: `electron/auth/oauth-callback-server.ts`, `electron/auth/oauth-server-state.ts`

Desktop PKCE OAuth flow:
1. Renderer calls `cloudAuth.signInWithGoogle(config)` → opens system browser
2. User approves → Google redirects to local callback server
3. Callback server extracts `{ state, code }` from URL
4. Renderer calls `cloudAuth.handleOAuthCallback(partial, codeVerifier, redirectUri)`

Verify:
- `oauth-callback-server.ts` runs on a local port (e.g. `http://localhost:{port}`)
- `oauth-server-state.ts` stores `codeVerifier` between steps 1 and 4
- `redirectUri` matches what was registered with Google

### B5 — Verify OperationalAuth PIN storage

**Read**: `electron/auth/desktop-operational-auth.ts`

Desktop uses Electron's `safeStorage` API for PIN storage. Verify:
- PIN verifier is stored using `safeStorage.encryptString()` / `safeStorage.decryptString()`
- Not stored in plain text or a plain JSON file

### B6 — Verify all CloudAuth methods accessible from renderer

**Read**: `electron/ipc-handlers/cloud-auth-handlers.ts`, `electron/preload/handlers-auth.ts`

Every public `CloudAuth` method must have a corresponding IPC handler:

```
signInWithGoogle          → IPC: cloudAuth.signInWithGoogle
handleOAuthCallback       → IPC: cloudAuth.handleOAuthCallback
signInWithGoogleIdToken  → IPC: cloudAuth.signInWithGoogleIdToken
signInWithEmail          → IPC: cloudAuth.signInWithEmail
registerWithEmail        → IPC: cloudAuth.registerWithEmail
verifyEmailAddress       → IPC: cloudAuth.verifyEmailAddress
resetPassword            → IPC: cloudAuth.resetPassword
completePasswordReset    → IPC: cloudAuth.completePasswordReset
refreshSession           → IPC: cloudAuth.refreshSession
restoreSession           → IPC: cloudAuth.restoreSession
signOut                   → IPC: cloudAuth.signOut
registerTrustedDevice    → IPC: cloudAuth.registerTrustedDevice
listTrustedDevices       → IPC: cloudAuth.listTrustedDevices
removeTrustedDevice      → IPC: cloudAuth.removeTrustedDevice
```

And for `OperationalAuth`:
```
setupPin                  → IPC: operationalAuth.setupPin
verifyPin                 → IPC: operationalAuth.verifyPin
changePin                 → IPC: operationalAuth.changePin
hasPinEnrolled           → IPC: operationalAuth.hasPinEnrolled
clearPin                 → IPC: operationalAuth.clearPin
getEnrollmentState       → IPC: operationalAuth.getEnrollmentState
beginEnrollment          → IPC: operationalAuth.beginEnrollment
completeEnrollmentWithCloudVerify → IPC: operationalAuth.completeEnrollmentWithCloudVerify
requestPinRecovery       → IPC: operationalAuth.requestPinRecovery
verifyPinRecoveryCode     → IPC: operationalAuth.verifyPinRecoveryCode
resetPinWithRecovery     → IPC: operationalAuth.resetPinWithRecovery
serializeSession         → IPC: operationalAuth.serializeSession
deserializeSession       → IPC: operationalAuth.deserializeSession
```

If any are missing, add them.

---

## PART C — TEST REQUIREMENT

After changes, run:

```bash
npx vitest run electron/auth/__tests__/
npx vitest run electron/services/canonical/__tests__/cloud-client.test.ts
```

All tests must pass. If tests fail, fix the implementation — do not skip or delete tests.

---

## PART D — COMMIT AND PUSH

```bash
# 1. Update CHANGELOG.md

# 2. npm install (if package.json changed)

# 3. Commit
git add .
git commit -m "fix(auth): update @soostori/auth to ^0.1.0-alpha.7, verify StoredSession
         consumption, verify cross-device enrollment IPC bridge, audit identity chain"

# 4. Push
git push origin main
```

---

## OUTPUT

Produce `PHASE-01-DESKTOP-AUDIT-REPORT.md` in the Desktop root containing:
- Which items were verified correct
- Which items were fixed
- Any new gaps found
- Git commit SHA
- Test results
