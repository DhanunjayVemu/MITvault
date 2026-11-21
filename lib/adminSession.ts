import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Sessions are stateless: the cookie holds an expiry time plus an HMAC of
 *  it, signed with a key derived from server-only secrets. Any server
 *  instance can verify it, so it keeps working on serverless hosts and
 *  across restarts. The admin password is only ever checked in
 *  /api/admin/login. Changing ADMIN_PASSWORD or the service role key
 *  invalidates every existing session. */
function signingKey(): Buffer | null {
  const password = process.env.ADMIN_PASSWORD;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!password || !serviceKey) return null;
  return createHash("sha256")
    .update(`pyqvault-admin-session:${password}:${serviceKey}`)
    .digest();
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function createSession(): { token: string; maxAgeSeconds: number } | null {
  const key = signingKey();
  if (!key) return null;
  const expiresAt = String(Date.now() + SESSION_TTL_MS);
  return {
    token: `${expiresAt}.${sign(expiresAt, key)}`,
    maxAgeSeconds: SESSION_TTL_MS / 1000,
  };
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const key = signingKey();
  if (!key) return false;

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;
  if (!(Number(expiresAt) > Date.now())) return false;

  const expected = Buffer.from(sign(expiresAt, key));
  const provided = Buffer.from(signature);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
