import { hasAdminSession } from "@/lib/adminAuth";
import { NavbarClient } from "@/components/NavbarClient";

// Admin links are shown only when the server has verified the signed, HttpOnly
// admin_session cookie. Only a boolean reaches the client; browser storage is not used.
export async function Navbar() {
  const isAdmin = await hasAdminSession();

  return <NavbarClient isAdmin={isAdmin} />;
}
