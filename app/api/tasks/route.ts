import { z } from "zod";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database } from "@/db";
import { taskInput } from "@/lib/tasks";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function handle(
  request: Request,
  action: (userId: string) => Promise<Response>,
) {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return json({ error: "Please sign in to access your tasks." }, 401);
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        return json({ error: "Request origin is not allowed." }, 403);
      if (!request.headers.get("content-type")?.includes("application/json"))
        return json({ error: "Expected JSON." }, 415);
    }
    return await action(user.userId);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json({ error: error.issues[0]?.message || "Invalid task." }, 400);
    if (error instanceof SyntaxError)
      return json({ error: "Invalid JSON." }, 400);
    console.error("Task API failed", error);
    return json(
      { error: "Your tasks could not be saved or loaded. Please try again." },
      503,
    );
  }
}
async function body(request: Request) {
  const text = await request.text();
  if (text.length > 200000)
    throw new z.ZodError([
      {
        code: "custom",
        path: [],
        message: "This file is too large. Import up to 100 tasks at a time.",
      },
    ]);
  return JSON.parse(text);
}
export async function GET(request: Request) {
  return handle(request, async (userId) => {
    const result = await database()
      .prepare(
        "SELECT id, data, version, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
      )
      .bind(userId)
      .all<{
        id: string;
        data: string;
        version: number;
        created_at: string;
        updated_at: string;
      }>();
    return json({
      tasks: result.results.map((row) => ({
        ...JSON.parse(row.data),
        id: row.id,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  });
}
export async function POST(request: Request) {
  return handle(request, async (userId) => {
    const input = z
      .object({ tasks: z.array(taskInput).min(1).max(100) })
      .parse(await body(request));
    const now = new Date().toISOString();
    const tasks = input.tasks.map((data) => ({
      ...data,
      id: crypto.randomUUID(),
      version: 1,
      createdAt: now,
      updatedAt: now,
    }));
    await database().batch(
      tasks.map((task) =>
        database()
          .prepare(
            "INSERT INTO tasks (id,user_id,data,version,created_at,updated_at) VALUES (?,?,?,1,?,?)",
          )
          .bind(
            task.id,
            userId,
            JSON.stringify(taskInput.parse(task)),
            now,
            now,
          ),
      ),
    );
    return json({ tasks }, 201);
  });
}
export async function PUT(request: Request) {
  return handle(request, async (userId) => {
    const input = z
      .object({
        id: z.string().uuid(),
        version: z.number().int().positive(),
        task: taskInput,
      })
      .parse(await body(request));
    const now = new Date().toISOString();
    const result = await database()
      .prepare(
        "UPDATE tasks SET data = ?, version = version + 1, updated_at = ? WHERE id = ? AND user_id = ? AND version = ? RETURNING created_at",
      )
      .bind(JSON.stringify(input.task), now, input.id, userId, input.version)
      .first<{ created_at: string }>();
    if (!result)
      return json(
        {
          error:
            "This task changed in another window. Refresh your tasks before trying again.",
        },
        409,
      );
    return json({
      task: {
        ...input.task,
        id: input.id,
        version: input.version + 1,
        createdAt: result.created_at,
        updatedAt: now,
      },
    });
  });
}
export async function DELETE(request: Request) {
  return handle(request, async (userId) => {
    const input = z
      .object({ id: z.string().uuid(), version: z.number().int().positive() })
      .parse(await body(request));
    const result = await database()
      .prepare("DELETE FROM tasks WHERE id = ? AND user_id = ? AND version = ?")
      .bind(input.id, userId, input.version)
      .run();
    if (!result.meta.changes)
      return json(
        {
          error: "This task changed in another window. Refresh and try again.",
        },
        409,
      );
    return json({ ok: true });
  });
}
