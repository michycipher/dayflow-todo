import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL before applying the database schema.");
  process.exit(1);
}

const sql = neon(url);
await sql`CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  data text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at text NOT NULL,
  updated_at text NOT NULL
)`;
await sql`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id)`;
console.log("Dayflow database schema is ready.");
