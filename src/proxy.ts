import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

// Early redirect for admin routes (Node.js runtime, the Next.js 16 default).
// Defense in depth only: every admin page and server action also calls
// requireAdmin() itself, because a Proxy matcher can silently stop covering
// a route or a Server Function.
export function proxy(request: NextRequest) {
  // Server Action calls are left to the action's own requireAdmin(). With an expired
  // session that answers with Next's action redirect to /login, which the browser
  // follows; a Proxy redirect here would surface as "An unexpected response was
  // received from the server."
  if (request.method === "POST" && request.headers.has("next-action")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;

  if (verifyAdminSessionToken(token)) {
    return NextResponse.next();
  }

  // 303 for non-GET requests (for example a form posted without JavaScript), so the
  // browser loads /login with GET instead of re-posting the form to it.
  const status = request.method === "GET" || request.method === "HEAD" ? 307 : 303;

  return NextResponse.redirect(new URL("/login", request.url), status);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
