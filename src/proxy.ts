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
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;

  if (verifyAdminSessionToken(token)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
