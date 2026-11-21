import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { ADMIN_SESSION_COOKIE, createSession } from "@/lib/adminSession";

export const runtime = "nodejs";

function passwordMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Compare equal-length buffers to keep this constant-time; a length
  // mismatch alone is safe to leak (it's not part of the secret).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Checks the admin password (server-only) and, if correct, starts a
 *  session: a signed, expiring token handed to the browser as an
 *  HttpOnly/Secure/SameSite cookie. The password itself never touches
 *  the browser again after this request. */
export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Admin login is not configured" }, { status: 500 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.password || !passwordMatches(body.password, expected)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const session = createSession();
  if (!session) {
    return NextResponse.json({ error: "Admin login is not configured" }, { status: 500 });
  }

  const { token, maxAgeSeconds } = session;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return res;
}
