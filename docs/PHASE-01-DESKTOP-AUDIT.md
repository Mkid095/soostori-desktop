# Phase 1 — Desktop Platform: Authentication Audit Prompt

**Phase:** 1 of 27
**Platform:** Desktop (`Documents/GitHub/soostori-desktop`)
**Goal:** Audit how Desktop consumes `@soostori/auth`, fix gaps, commit, push.

---

## Prerequisites

Before making any changes, read these files:
- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `.ai/coding-rules.md`
- `.ai/project-manifest.md`

Also read the SDK Phase 1 complete record:
- `../soostori-sdk/docs/PHASE-01-COMPLETE.md`

---

## Context: What the SDK Published

The SDK (`@soostori/auth@0.1.0-alpha.9`) provides:

**CloudAuth** — 14 methods:
- `signInWithGoogle(config)` → PKCE OAuth flow (browser-like desktop)
- `handleOAuthCallback(partial, codeVerifier, redirectUri)` → exchange code for session
- `signInWithGoogleIdToken(params)` → Google ID token flow
- `signInWithEmail(email, password)` → email/password login
- `registerWithEmail(email, password, name)` → email/password registration
- `verifyEmailAddress(token)` → email verification
- `resetPassword(email)` / `completePasswordReset(token, newPassword)` → password reset
- `refreshSession()` → refresh session
- `restoreSession()` → restore from local storage
- `signOut()` → sign out
- `registerTrustedDevice(name)` / `listTrustedDevices()` / `removeTrustedDevice(deviceId)` → trusted devices

**OperationalAuth** — 14 methods:
- `setupPin()`, `verifyPin()`, `changePin()`, `hasPinEnrolled()`, `clearPin()`
- `getEnrollmentState()`, `beginEnrollment()`, `completeEnrollmentWithCloudVerify()`
- `requestPinRecovery()`, `verifyPinRecoveryCode()`, `resetPinWithRecovery()`
- `isWithinOfflineEntitlement()`, `isSessionExpired()`
- `serializeSession()` / `deserializeSession()`

**Identity fields in session results:**
- `userId`, `email`, `employeeId`, `shopId`, `deviceId`

---

## Audit Questions

### 1. Package Version

- What version of `@soostori/auth` is Desktop currently using?
- Is it `^0.1.0-alpha.9`? If not, that is a gap to fix.

### 2. CloudAuth Usage

- Does Desktop import and use `CloudAuth` from `@soostori/auth`?
- List all auth-related imports from `@soostori/auth`.

### 3. Google OAuth / ID Token

- Does Desktop use `signInWithGoogle()` with PKCE or `signInWithGoogleIdToken()`?
- Is the correct SDK method being called?
- Is Google client ID configured correctly?

### 4. Email/Password

- Does Desktop use `registerWithEmail()` / `signInWithEmail()` from the SDK?
- Or does it have its own email/password implementation?

### 5. Session Management

- Does Desktop use `restoreSession()` to restore sessions on app load?
- Does Desktop use `refreshSession()` to keep sessions alive?
- Where is session data stored? (Keychain, electron-store, something else?)

### 6. Identity Mapping

- After sign-in, does Desktop correctly extract `userId`, `email`, `employeeId`, `shopId`, `deviceId` from the auth result?
- Does Desktop correctly map these to its own state?

### 7. Operational PIN

- Does Desktop implement the operational PIN flow using `OperationalAuth`?
- Is `getEnrollmentState()` checked on app load?
- Is `beginEnrollment()` / `completeEnrollmentWithCloudVerify()` wired up?
- Where is the PIN stored? (Keytar / keychain?)

### 8. Trusted Devices

- Does Desktop implement the trusted device flow?
- Does it call `registerTrustedDevice()` / `listTrustedDevices()` / `removeTrustedDevice()`?

### 9. Events

- Does Desktop listen to `AuthEvent` (SIGNED_IN, SIGNED_OUT, SESSION_EXPIRED, etc.)?
- Does Desktop react to these events appropriately?

### 10. Consistency with SDK

- List any ways Desktop's auth implementation diverges from what the SDK provides.
- Are there areas where Desktop has invented auth logic that the SDK already handles?

---

## Gap Analysis

For each area above, mark:
- **Verified** — matches SDK contract
- **Gap** — needs to be fixed
- **N/A** — not applicable

List every gap with: file path, line number, description of the mismatch, and what the correct behavior should be.

---

## Fix

Fix all gaps. Rules:
- Use the SDK (`@soostori/auth`) as the single source of truth for auth
- Do not invent parallel auth logic
- If the SDK is missing a method Desktop needs, note it as a SDK gap (do NOT implement it in Desktop)
- Commit each fix with a descriptive message

---

## Commit

After all fixes, commit with a message like:
```
fix(auth): phase-1 desktop — adopt CloudAuth, update @soostori/auth to 0.1.0-alpha.9
```

Then push to the remote.

---

## Output

Produce a report with:

```markdown
## Phase 1 — Desktop Auth Audit Report

### Package Version
[Current version and whether it matches SDK]

### CloudAuth Usage
[How Desktop uses CloudAuth — or doesn't]

### Gaps Found
| Area | Status | File | Line | Issue | Fix |
|------|--------|------|------|-------|-----|

### Fixes Applied
| Fix | Commit SHA |
|-----|-----------|

### Push Confirmed
[Yes/No + remote + branch]
```
