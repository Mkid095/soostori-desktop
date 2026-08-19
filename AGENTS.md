# AI Agent Rules — Soostori Desktop

> **CRITICAL:** These rules are STRICTLY ENFORCED. Read `.ai/coding-rules.md` before any work.

## Platform Context

This is **soostori-desktop** — the offline-first Electron POS app, part of the Soostori multi-product platform.

**Full platform architecture:** `docs/ARCHITECTURE.md` — covers all 5 products, tech stack, user roles, sync strategy, and build sequence.

**Current build phase:** Phase 1 — Desktop (add sync queue layer, ready for backend connection)

## ANPAS — Read Order (mandatory)

Before touching any code, read in this exact order:

1. `.ai/coding-rules.md` — enforcement rules
2. `.ai/project-manifest.md` — system overview, tech stack, critical areas
3. `.ai/review-checklist.md` — pre-commit verification checklist
4. `.ai/workflows.md` — execution flow and discovery phases
5. `CLAUDE.md` (root) — this file, project structure and architecture
6. `docs/ARCHITECTURE.md` — **platform-level architecture** (required reading)
7. Relevant feature `README.md` files under `docs/`
8. Then: the actual source files you need to modify

---

## Before Modifying Code

1. Read `.ai/coding-rules.md` — enforcement rules, non-negotiable
2. Read `.ai/project-manifest.md` — system overview
3. Read `.ai/review-checklist.md` — must complete every item
4. Inspect existing implementation
5. Do NOT rewrite working systems
6. Check blast radius before making changes

## When Adding Features

Required updates — every time, without exception:

- [ ] Feature README in `docs/[domain]-README.md`
- [ ] `CHANGELOG.md` — update with files changed and description
- [ ] `.ai/review-checklist.md` — complete every item

---

## Structural Rules

### Feature-Based Organization
Organize by **business capability**, not technical category.
- BAD: `controllers/`, `services/`, `utils/`
- GOOD: domain-scoped files like `pos-cart.manager.ts`, `inventory.repository.ts`

### Max 150 Lines/File
- Hard limit: 150 lines per source file
- Exceptions: generated files, migrations, config files, test files
- If approaching 150 lines → split into a feature folder

### One Responsibility Per File
- Component → UI only
- Service → Business logic only
- Repository → Data access only
- Types → Type definitions only

---

## Naming Convention

Pattern: `[domain]-[action]-[type].ext`

Examples:
- `pos-cart.manager.ts` — cart business logic
- `inventory.repository.ts` — inventory data access
- `receipt-data.mapper.ts` — data transformation
- `scanner-status.hook.ts` — React hook

**Forbidden filenames:** `helpers.ts`, `common.ts`, `misc.ts`, `utils.ts`, `tools.ts`

---

## Code Quality

- **No business logic in UI** — Components must not contain API calls, validation, or business rules. Extract to services, hooks, or utilities.
- **Types required** — All public interfaces must have TypeScript types. No `any` without documentation.
- **No hardcoded values** — URLs, labels, colors, roles → configuration.
- **Input validation** — All user input validated with Zod schemas on both frontend and backend.
- **No `any` type** — without documented exception in code comment.

---

## Business Logic Boundaries

Business logic MUST live in:
- `src/lib/` — shared utilities, types, API bridge
- `electron/` — main process (database, hardware, IPC)

Business logic MUST NOT live in:
- `src/pages/*.tsx` — page components are UI only
- `src/components/` — UI-only components

---

## Documentation Requirements

### Feature README
Every domain must have a `docs/[domain]-README.md` covering:
- Purpose and scope
- Architecture and data flow
- Main files and their responsibilities
- Key data structures

### CHANGELOG.md
**Every commit must update `CHANGELOG.md`** with:
- Date
- Category: Added / Changed / Fixed / Deprecated / Removed / Security / Docs
- Description
- Files changed

---

## Commit Format

```
feat(domain): description
fix(domain): description
docs(domain): description
refactor(domain): description
test(domain): description
chore(domain): description
```

Examples:
```
feat(pos): add held sale cart persistence
fix(inventory): prevent negative stock on adjustment
docs(pos): update receipt printing data flow
```

---

## UI Rules

- **No AI visual vocabulary** in UI: no sparkle (✨, `<Sparkles>`), no magic wand (🪄, `<Wand>`), no brain (🧠), no robot (🤖), no orb, no lightning-as-decoration, no neural nodes, no purple/violet gradient backgrounds, no glassmorphism, no pulsing glow/shimmer. Use Lucide icons. Reserve ✨ ONLY for actual AI features, not every action.

- **No emojis in UI** — Use Lucide icons only
- **Consistent design system** — Use existing Tailwind patterns, no inline styles
- **Professional icons only** — Lucide React icon library
- **No native dialogs** — Never use `alert()`, `confirm()`, `prompt()`; use toast/dialog components only

---

## Restricted Areas (changes require extra review)

- `electron/database/index.ts` — SQLite schema; changes require migration script
- `electron/hardware/printer.ts` — ESC/POS command builder; protocol changes affect all printers
- `electron/main.ts` — Main process lifecycle; IPC security model depends on this

---

## Discovery Phases

| Scope | Time Budget | Actions |
|-------|------------|---------|
| Quick (typo, label) | < 2 min | Read CLAUDE.md + relevant feature README + 3-5 files |
| Module (new feature) | < 5 min | Above + module README + inspect existing patterns |
| Full Audit (architecture) | < 15 min | All docs + database schema + full code map |

---

## Review Checklist (verify before declaring done)

- [ ] Feature-based organization followed
- [ ] All files ≤ 150 lines (exceptions documented)
- [ ] Naming convention: `[domain]-[action]-[type]`
- [ ] No business logic in UI components
- [ ] Types/interfaces defined for all public APIs
- [ ] Feature README updated if structure changed
- [ ] CHANGELOG.md updated
- [ ] No duplicate utilities
- [ ] Tests added/updated
- [ ] Commit message follows `feat(domain): description` format

---

## NEVER do any of these:

- Create `helpers.ts`, `common.ts`, `misc.ts`, `utils.ts`, `tools.ts` — **forbidden**
- Put business logic in React components (`src/pages/*.tsx`) — **forbidden**
- Put API calls directly in components — use hooks only
- Exceed **150 lines per file** — split immediately
- Add dependencies without explicit approval
- Skip `CHANGELOG.md` update — it is **mandatory**
- Use `any` type without documented exception
- Use native `alert()`, `confirm()`, `prompt()` — use toast/dialog components only
- Merge metadata updates (never replace): `const merged = { ...existing, ...updates }`
