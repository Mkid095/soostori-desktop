# AI Agent Rules

## Before Modifying Code

- Inspect existing implementation first
- Do not rewrite working systems
- Follow existing patterns
- Check blast radius before making changes

## When Adding Features

Required updates:

- [ ] Feature README (create if new feature folder)
- [ ] CHANGELOG.md
- [ ] Architecture docs (if applicable)

## Never

- Create duplicate utilities
- Add dependencies without approval
- Rename existing files without documented reason
- Mix business logic with UI
- Create files exceeding 150 lines

## Commit Format

```
feat(domain): description
fix(domain): description
docs(domain): description
refactor(domain): description
```

## Discovery Phase

Before any task:

1. Read CLAUDE.md
2. Read .ai/project-manifest.md
3. Inspect affected files
4. Identify dependencies
5. Create plan

## Review Before Completing

Run the checklist in `.ai/review-checklist.md`
