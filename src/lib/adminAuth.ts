import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/adminSession";

// Server-side admin authorization for server components and server actions.
// The signed, HttpOnly admin_session cookie is the only source of truth;
// browser storage is never consulted.
export async function hasAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;

  return verifyAdminSessionToken(token);
}

// Call first in every admin page, layout, and server action, before any data access.
export async function requireAdmin() {
  if (!(await hasAdminSession())) {
    redirect("/login");
  }
}
