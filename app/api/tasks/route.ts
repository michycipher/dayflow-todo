import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { database } from "@/db";
import { auth } from "@/lib/auth/server";
import { tasks as taskTable } from "@/db/schema";
import { getSession, jsonResponse } from "@/lib/session";
import { taskInput } from "@/lib/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestOriginAllowed = (request: Request) => {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
};

async function handle(
  request: Request,
  action: (userId: string) => Promise<Response>,
) {
  let userId: string;
  let setCookie: string | undefined;
  try {
    const { data: authSession, error } = await auth.getSession();
    if (error) throw error;
    if (authSession?.user?.id) {
      userId = authSession.user.id;
    } else {
      const guestSession = getSession(request);
      userId = guestSession.userId;
      setCookie = guestSession.setCookie;
    }
    if (
      request.method !== "GET" &&
      !request.headers.get("content-type")?.includes("application/json")
    )
      return jsonResponse(
        { error: "Expected JSON." },
        415,
        setCookie,
      );

    const response = await action(userId);
    if (setCookie) response.headers.append("Set-Cookie", setCookie);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonResponse(
        { error: error.issues[0]?.message || "Invalid task." },
        400,
        setCookie,
      );
    if (error instanceof SyntaxError)
      return jsonResponse({ error: "Invalid JSON." }, 400, setCookie);
    console.error("Task API failed", error);
    return jsonResponse(
      { error: "Your tasks could not be saved or loaded. Please try again." },
      503,
      setCookie,
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
    const rows = await database()
      .select()
      .from(taskTable)
      .where(eq(taskTable.userId, userId))
      .orderBy(desc(taskTable.createdAt));
    return jsonResponse({
      tasks: rows.map((row) => ({
        ...JSON.parse(row.data),
        id: row.id,
        version: row.version,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  });
}

export async function POST(request: Request) {
  return handle(request, async (userId) => {
    const requestBody = await body(request);
    if (!requestOriginAllowed(request))
      return jsonResponse({ error: "Request origin is not allowed." }, 403);
    const input = z
      .object({ tasks: z.array(taskInput).min(1).max(100) })
      .parse(requestBody);
    const now = new Date().toISOString();
    const created = input.tasks.map((task) => ({
      id: crypto.randomUUID(),
      userId,
      data: JSON.stringify(task),
      version: 1,
      createdAt: now,
      updatedAt: now,
    }));
    const rows = await database().insert(taskTable).values(created).returning();
    return jsonResponse(
      {
        tasks: rows.map((row) => ({
          ...JSON.parse(row.data),
          id: row.id,
          version: row.version,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
      },
      201,
    );
  });
}

export async function PUT(request: Request) {
  return handle(request, async (userId) => {
    const requestBody = await body(request);
    if (!requestOriginAllowed(request))
      return jsonResponse({ error: "Request origin is not allowed." }, 403);
    const input = z
      .object({
        id: z.string().uuid(),
        version: z.number().int().positive(),
        task: taskInput,
      })
      .parse(requestBody);
    const now = new Date().toISOString();
    const [updated] = await database()
      .update(taskTable)
      .set({
        data: JSON.stringify(input.task),
        version: sql`${taskTable.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(taskTable.id, input.id),
          eq(taskTable.userId, userId),
          eq(taskTable.version, input.version),
        ),
      )
      .returning({ createdAt: taskTable.createdAt });
    if (!updated)
      return jsonResponse(
        {
          error:
            "This task changed in another window. Refresh your tasks before trying again.",
        },
        409,
      );
    return jsonResponse({
      task: {
        ...input.task,
        id: input.id,
        version: input.version + 1,
        createdAt: updated.createdAt,
        updatedAt: now,
      },
    });
  });
}

export async function DELETE(request: Request) {
  return handle(request, async (userId) => {
    const requestBody = await body(request);
    if (!requestOriginAllowed(request))
      return jsonResponse({ error: "Request origin is not allowed." }, 403);
    const input = z
      .object({ id: z.string().uuid(), version: z.number().int().positive() })
      .parse(requestBody);
    const deleted = await database()
      .delete(taskTable)
      .where(
        and(
          eq(taskTable.id, input.id),
          eq(taskTable.userId, userId),
          eq(taskTable.version, input.version),
        ),
      )
      .returning({ id: taskTable.id });
    if (!deleted.length)
      return jsonResponse(
        {
          error: "This task changed in another window. Refresh and try again.",
        },
        409,
      );
    return jsonResponse({ ok: true });
  });
}
