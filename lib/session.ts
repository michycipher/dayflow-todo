import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "dayflow_session";
const MAX_AGE = 60 * 60 * 24 * 180;

function signature(id: string) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("APP_SESSION_SECRET must contain at least 32 characters.");
  return createHmac("sha256", secret).update(id).digest("base64url");
}

function verify(value: string | undefined) {
  if (!value) return null;
  const [id, supplied] = value.split(".");
  if (!id || !supplied || !/^[a-f0-9-]{36}$/i.test(id)) return null;
  const expected = Buffer.from(signature(id));
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  return id;
}

export function getExistingSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const current = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  return verify(current);
}

export function getSession(request: Request) {
  const existing = getExistingSession(request);
  if (existing) return { userId: existing, setCookie: undefined };

  const userId = randomBytes(16).toString("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
  const value = `${userId}.${signature(userId)}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return {
    userId,
    setCookie: `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`,
  };
}

export function clearGuestCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function jsonResponse(
  data: unknown,
  status = 200,
  setCookie?: string,
) {
  const response = Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  if (setCookie) response.headers.append("Set-Cookie", setCookie);
  return response;
}
