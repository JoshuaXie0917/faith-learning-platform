# Admin access and request safety

Short operational notes for the admin login, sessions, Blob uploads and the anonymous visitor key.

## Admin login and sessions

- `POST /api/auth/login` checks `ADMIN_PASSWORD` with a constant-time comparison and answers every wrong password with the same generic message.
- A successful login sets the signed, HttpOnly `admin_session` cookie (8 hours). Every admin page, layout and Server Action calls `requireAdmin()` itself; `src/proxy.ts` is only an early redirect for page requests and lets Server Action calls through to that check, so an expired session ends in a normal redirect to `/login`.
- The navbar shows admin links only when the server has verified the cookie. Browser storage is not used for admin state.
- Accepted risk: sessions cannot be revoked individually. To end every session at once, rotate `ADMIN_PASSWORD` (it is the signing key) and redeploy.

## Login throttling

- Policy (`src/lib/loginThrottle.ts`): 5 attempts per client address in 15 minutes; the next attempt starts a 15-minute block during which the password is not checked (HTTP 429 with `Retry-After`). A successful login clears the counter.
- Stored in the `LoginThrottle` table (migration `20261007180000_add_login_throttle`). The key is an HMAC of the client address with `CRON_SECRET` (never `ADMIN_PASSWORD`); raw addresses are never stored. Without `CRON_SECRET` (local development, Preview) each server instance uses its own random key, so counting is per instance. Rotating `CRON_SECRET` resets every counter. Rows older than a day are pruned, at most 100 per login attempt.
- The client address is the first `x-forwarded-for` entry, which Vercel sets itself. IPv6 addresses are grouped by /64.
- Unblock everyone (for example after an admin locked themselves out):

  ```sql
  DELETE FROM "LoginThrottle";
  ```

- Deploy order: apply the migration before deploying code that contains the throttle, otherwise every login returns 500.

## Vercel Blob uploads

- `POST /api/blob/upload` issues upload tokens only with an admin session. Vercel's upload-completed callback has no cookie; it is accepted only with a valid `x-vercel-signature` (HMAC with `BLOB_READ_WRITE_TOKEN`, verified by `@vercel/blob`). Logs contain the Blob pathname, never the full URL.
- `POST /api/blob/series-image-presign` requires an admin session.

## Anonymous visitor key

- The key lives in the browser's local storage. `VisitorKeySync` (root layout) copies it into the `readVisitorKey` cookie on every entry path. If the cookie had to be created on a server-rendered `/sermons/...` page, the page reloads once so the server can show overdue Content the visitor favorited.
