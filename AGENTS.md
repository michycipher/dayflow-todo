# Dayflow working agreement

## Product and structure
Build a calm, accessible task workspace. Do not label deterministic helpers as AI.
- app/page.tsx: server entry and identity.
- app/dayflow.tsx: interactive workspace.
- app/globals.css: shared tokens and responsive layout.
- app/api/tasks/route.ts: authenticated task API.
- lib/tasks.ts: validated task model.
- db/: D1 schema and access. drizzle/: generated immutable migrations.

## Rules
1. Inspect files and Git status before changes.
2. Reuse the React/TypeScript stack and installed UI primitives.
3. Scope every database operation to the authenticated user.
4. Validate bodies; bind SQL parameters; never commit credentials.
5. Persist tasks in D1, using browser storage only for preferences.
6. Preserve user input on errors and show loading, empty and error states.
7. Support keyboard navigation, visible focus and mobile layouts.
8. Check TypeScript, production build and affected functionality before delivery.
9. Report verified deployment and GitHub status honestly.

## Commands
Use npm.cmd on Windows when PowerShell blocks npm.ps1.
Commands: npm run dev, npm run build, npm run db:generate.
Publish with the Sites workflow and the existing manifest identity.
