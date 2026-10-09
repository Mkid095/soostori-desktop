# Phase 2 — Desktop Platform: Business & Account Provisioning Audit Prompt

**Phase:** 2 of 27
**Platform:** Desktop (`Documents/GitHub/soostori-desktop`)
**Goal:** Audit how Desktop handles business/account provisioning with the SDK, fix gaps, commit, push.

---

## Prerequisites

Before making any changes, read:
- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `.ai/coding-rules.md`

Also read the Phase 2 SDK acceptance record:
- `../../soostori-sdk/docs/PHASE-02-BUSINESS-ACCEPTANCE.md`

---

## Context: What the SDK Published for Phase 2

**SDK packages:**
- `@soostori/business@0.1.0-alpha.2`
- `@soostori/team@0.1.0-alpha.3`
- `@soostori/subscription@0.1.0-alpha.2`
- `@soostori/devices@0.1.0-alpha.2`
- `@soostori/cloud@0.1.0-alpha.5`
- `@soostori/events@0.1.0-alpha.2`

**SDK provides:**
- `BusinessService.createBusiness()` — creates business + owner membership
- `BusinessRepository` — Person, Business, Membership, Device, Subscription entities
- `TeamService.inviteMember()` — sends invitation (idempotent)
- `TeamService.acceptInvitation()` — accepts invitation
- `DeviceService.registerDevice()` — registers device with subscription limit enforcement
- `DeviceLimitExceededError`
- `setActiveBusiness()` / `getActiveBusiness()` — business switching
- Event types: `EMPLOYEE_INVITED`, `EMPLOYEE_ACCEPTED`, `EMPLOYEE_ROLE_CHANGED`, `EMPLOYEE_REVOKED`, `business.created`, `business.updated`
- Primary device: `PrimaryDeviceCoordinator.transferPrimary()`
- Offline grace period: 3 days

---

## Audit Questions

### 1. Package Versions

- What version of `@soostori/business` is Desktop currently using?
- Is it `^0.1.0-alpha.2`? Update if not.
- Check `@soostori/team`, `@soostori/subscription`, `@soostori/devices` too.

### 2. SDK Package Usage

- Does Desktop import from `@soostori/business`, `@soostori/team`, `@soostori/devices`?
- List all `@soostori/*` imports.

### 3. Business Service Usage

- Does Desktop use `BusinessService.createBusiness()`?
- Or does it have its own business creation logic?
- How does Desktop create a new business?

### 4. Business Provisioning Flow

- How is the first business created on a new Desktop install?
- Is the owner account created automatically?
- Is the bootstrap flow handled correctly?

### 5. Invitation System

- Does Desktop use `TeamService.inviteMember()`?
- How are invitations sent? (email? Local network?)
- Does Desktop use `TeamService.acceptInvitation()`?
- Is the invitation flow wired to IPC handlers?

### 6. Business Switching

- Can a user with multiple businesses switch between them?
- Does Desktop use `setActiveBusiness()` / `getActiveBusiness()`?
- Is the active business reflected in the UI?

### 7. Membership Isolation

- Are all Desktop operations scoped to the active business?
- Can data from one business leak into another?
- Are all SQLite queries filtering by `shopId`?

### 8. Role Enforcement

- Are Desktop UI elements shown/hidden based on role?
- Is the cashier view different from owner view?
- Are Owner, Manager, Cashier, Attendant, Viewer roles handled?

### 9. Device Registration

- Does Desktop register itself as a device?
- Does it use `DeviceService.registerDevice()`?
- Is the device linked to the correct business?
- Is the Primary Device switching handled?

### 10. Subscription Enforcement

- Does Desktop check subscription status?
- Does it handle `DeviceLimitExceededError`?
- Does it enforce the 3-day offline grace period?

### 11. Events

- Does Desktop listen to business events?
- Do they trigger UI updates?

---

## Gap Analysis

For each area: **Verified** | **Gap** | **N/A**

List every gap with: file, line, issue, correct behavior.

---

## Fix

Fix all gaps. Rules:
- Use the SDK as the single source of truth
- Follow ANPAS: 150-line cap, feature folders, CHANGELOG per commit
- IPC handlers must be added for any new SDK methods Desktop needs to call

---

## Commit and Push

Commit with a descriptive message and push.

---

## Output

Report: package versions, gaps found/fixed, commit SHA, push status.
