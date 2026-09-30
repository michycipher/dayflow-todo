import { eq } from "drizzle-orm";
import { database } from "@/db";
import { tasks } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { clearGuestCookie, getExistingSession, jsonResponse } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return jsonResponse({ error: "Request origin is not allowed." }, 403);

  try {
    const { data: session, error } = await auth.getSession();
    if (error) throw error;
    if (!session?.user)
      return jsonResponse({ error: "Sign in to save this workspace." }, 401);

    const guestUserId = getExistingSession(request);
    if (!guestUserId)
      return jsonResponse({ claimed: 0, message: "No guest workspace to import." });

    const moved = await database()
      .update(tasks)
      .set({ userId: session.user.id })
      .where(eq(tasks.userId, guestUserId))
      .returning({ id: tasks.id });
    const response = jsonResponse({ claimed: moved.length });
    response.headers.append("Set-Cookie", clearGuestCookie(request));
    return response;
  } catch (error) {
    console.error("Guest workspace claim failed", error);
    return jsonResponse({ error: "Your guest tasks could not be saved. Please try again." }, 503);
  }
}
