---
name: teammates
description: Orchestrate teams of Claude Code sessions — spawn teammates, assign tasks, synthesize results
---

# Orchestrate Agent Teams

Use this skill to coordinate **multiple Claude Code instances** working together as a team, with shared tasks, inter-agent messaging, and centralized management.

## When to Use

Agent teams are most effective for:
- **Research and review**: multiple teammates investigate different aspects simultaneously
- **New modules/features**: teammates each own a separate piece without conflicts
- **Debugging with competing hypotheses**: teammates test theories in parallel
- **Cross-layer coordination**: changes spanning frontend, backend, and tests

> **Sequential tasks, same-file edits, or tightly coupled work** → use subagents or a single session instead.

## Spawn Format

To spawn a team, include **all three** of these in your prompt:

1. The trigger phrase: **"Spawn an agent team with teammates named"**
2. Each teammate's **name** (so you can message them directly)
3. Each teammate's **specific task domain**
4. Instruction to **message each other** on overlapping findings

**Correct example:**
```
Spawn an agent team with teammates named offline-audit, ux-audit, and arch-audit to audit
the desktop app comprehensively.

- offline-audit: investigate offline-first data storage, sync queue design, and conflict handling.
- ux-audit: investigate UI/UX quality — navigation, loading states, error states, accessibility.
- arch-audit: investigate codebase structure, module boundaries, and technical debt.

Have them message each other on overlapping findings. Report a synthesized summary when done.
```

**Incorrect (triggers subagents, not team):**
```
Run these 3 audits in parallel using subagents.
```
This uses the word "subagents" — Claude will use the Task tool instead. Say:
```
"No, use a real agent team with named teammates, not subagents. Spawn teammates named [name1], [name2]."
```

## Prerequisite

`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` must be set in `~/.claude/settings.json`. Already enabled.

## Team Coordination Rules

1. **Give each teammate exclusive file ownership** — two teammates touching the same file = conflict
2. **Teammates message the lead** when done — the lead synthesizes findings
3. **Shared schemas/interfaces** — one teammate designs, shares via message, others implement
4. **Monitor via agent panel** — arrow keys select teammate, Enter to view transcript, Esc to interrupt

## Available Agent Types

| Type | Use For |
|---|---|
| `claude` | Catch-all, general purpose |
| `Explore` | Read-only broad searches |
| `feature-implementer` | Writes real, complete functionality in isolation |
| `feature-integrator` | Merges parallel worktree branches |
| `feature-planner` | Creates concrete, file-level implementation plans |
| `feature-researcher` | Deep read-only research of existing codebase |
| `feature-verifier` | Verifies implementation against plan, gates push |

## Workflow

1. **Lead spawns teammates** with exclusive task domains
2. **Teammates work independently**, each in their own context
3. **Teammates message each other** on overlapping findings
4. **Teammates message the lead** when done
5. **Lead synthesizes** a final summary from all findings

## Example: Translation Audit

```
Spawn an agent team with teammates named translations-audit and i18n-fixer to audit and fix all untranslated strings.

- translations-audit: scan all .tsx files in src/pages/ and src/components/ for hardcoded English strings not wrapped in t(). Report file paths and line numbers for each finding.
- i18n-fixer: take the findings from translations-audit and add the missing translation keys to src/lib/i18n.ts, updating both en and sw dictionaries.

Have translations-audit message i18n-fixer directly with findings. i18n-fixer reports back when done. Lead synthesizes the final summary.
```
