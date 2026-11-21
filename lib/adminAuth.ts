import "server-only";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSession } from "@/lib/adminSession";

/** All admin API routes require a valid session cookie. The cookie is set
 *  by POST /api/admin/login (after checking ADMIN_PASSWORD there) and holds
 *  only a signed, expiring token — the password itself is never sent to or
 *  stored in the browser. */
export function isAuthorized(req: NextRequest): boolean {
  return isValidSession(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
