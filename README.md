# Dayflow

Dayflow is a public todo workspace with projects, priorities, due dates, notes,
tags, subtasks, list and board views, search, a focus timer, JSON backup and a
checklist starter for the HNG assignment.

## Privacy and task storage

Anyone can open the deployed app. On first use, the server sets a signed,
HTTP-only browser session cookie and stores tasks in Neon Postgres under that
session. Task data is private to that browser profile; it does not sync to
another device and clearing site cookies creates a new empty workspace. There
is no account recovery or shared task list.

## Run locally

Use Node.js 22.13+ and npm. Copy `.env.example` to `.env`, set `DATABASE_URL`
to a Neon Postgres connection string, and set `APP_SESSION_SECRET` to at least
32 random characters. Keep `.env` private; it is ignored by Git.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

The database setup is safe to run again. Verify changes with:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Deploy to Vercel

Import the private GitHub repository into Vercel, then add `DATABASE_URL` and
`APP_SESSION_SECRET` to the project environment for Production and Preview.
The included `vercel.json` runs the idempotent database setup before every
build. Vercel's generated `.vercel.app` URL is publicly accessible; tasks remain
private to the browser session that created them.

The build expects `DATABASE_URL` to reach the hosted Neon database. Never add
real credentials to Git or `.env.example`.
