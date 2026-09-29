# Dayflow working agreement

Dayflow is a public, account-free todo app. Each browser receives a signed,
HTTP-only session cookie and sees only its own tasks. Do not claim that tasks
sync across devices or label deterministic helpers as AI.

## Structure

- `app/page.tsx` and `app/dayflow.tsx`: workspace entry and interactive UI.
- `app/api/tasks/route.ts`: validated, session-scoped task API.
- `lib/session.ts`: signed anonymous browser sessions.
- `lib/tasks.ts`: shared task validation, types and task helpers.
- `db/`: Neon Postgres connection and Drizzle schema.
- `scripts/migrate.mjs`: idempotent production database setup.
- `tests/`: task and API coverage.

## Rules

1. Inspect files and Git status before changes.
2. Scope every database operation to the verified session ID.
3. Validate request bodies, reject cross-origin writes, and never commit secrets.
4. Preserve user input on errors and show loading, empty and error states.
5. Support keyboard navigation, visible focus and mobile layouts.
6. Check TypeScript, production build and affected functionality before delivery.
7. Report deployment and GitHub status honestly; an available local build is not proof of a live deployment.

## Commands

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run db:migrate
```

Configure `DATABASE_URL` and a 32+ character `APP_SESSION_SECRET` in `.env` for
local use. Vercel needs both variables in its project settings. Its build
command runs the idempotent schema setup before compiling the app.
