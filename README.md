# Dayflow

A calm, responsive todo workspace built with AI assistance for HNG. Source lives in this folder.

## Features
- Create, edit, complete, reopen and delete tasks, with a short undo window.
- Projects, priorities, due dates, overdue indicators, notes, tags and subtasks.
- My day, all tasks, upcoming and completed views; list and board layouts.
- Search, priority filtering and sorting; keyboard shortcuts: N to add, / to search.
- Focus timer with 25-minute, 50-minute and 5-minute modes. Uses a deadline so background-tab throttling does not accumulate timer drift. Timer state lasts for the current page session.
- Light/dark appearance, responsive navigation, accessible dialogs and controls.
- JSON export and validated import (imports make new copies, up to 100 tasks per file).
- Cloudflare D1 persistence, authenticated user isolation, version checks to prevent silent concurrent overwrites.
- Progressive WebMCP list/create tools when supported by the browser.

Built *with* AI; no in-app AI model or API key is required. Sign-in and production hosting are provided by OpenAI Sites. There is no shared public task list.

## Development on Windows

Requires Node.js 22.13+ and npm. Use `npm.cmd` if PowerShell blocks npm.ps1.

```powershell
npm.cmd ci
npm.cmd run db:generate # only after schema changes; do not regenerate applied migrations
npm.cmd run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_faulty_forge.sql
npm.cmd run dev
```

Apply the existing migration once to each fresh local database. Open the local URL printed by the server, then choose **Sign in**. Loopback development simulates a local test account; production uses real platform sign-in. The local database and test tasks are ignored by Git and are not published.

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test tests/tasks.test.mjs
npm.cmd run build
```

`AGENTS.md` describes the project structure and working rules. `app/dayflow.tsx` composes the UI, `app/api/tasks/route.ts` validates requests and scopes every query by identity, and `db/schema.ts` defines the database. The server returns errors without discarding task-editor input.

## Hosting

The manifest `.openai/hosting.json` identifies this Site and its logical D1 binding. Use the installed Sites publishing workflow to build, commit, push source, package, save a version and deploy. Production migrations are applied by that workflow. No production credentials belong in this repository. Publishing elsewhere requires adapting the dispatcher-provided authentication and provisioning D1.

## Assignment checklist

- App and `AGENTS.md`: included.
- Live URL and private GitHub push: see the delivery message for verified status.
- Team Telegram membership: must be completed in the user's own Telegram session.

The app offers **Add my HNG assignment checklist** in a new empty workspace. It creates real tasks; completion is always controlled by the user.
