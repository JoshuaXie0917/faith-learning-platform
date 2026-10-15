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

## Public Share submissions

- `POST /api/shares` (`src/lib/shareCreate.ts`) reads at most 64 KB of request body for all fields together; a larger body is refused with HTTP 413 before it is parsed, and malformed JSON with 400. The delete and favorite routes accept at most 2 KB.
- Field rules (`src/lib/shareValidation.ts`, also used by the form's counter): name up to 50, title up to 100 and content up to 800 user-perceived characters. Punctuation, spaces, line breaks and emoji count; an emoji sequence or a letter with combining marks counts as one. Content must contain at least one letter, number or emoji, and control characters are refused.
- The same browser submitting the same title and text again within 10 minutes gets the first Share back (no duplicate).
- Throttle: 6 new Shares per client address per hour, then HTTP 429 with `Retry-After` for an hour. Stored in the `LoginThrottle` table as an HMAC of `share-create:<address>` (separate from login rows; no raw addresses). Login and Share rows look alike, so the `DELETE FROM "LoginThrottle";` statement above resets both; otherwise a block ends by itself after an hour.

## Vercel Blob uploads

- `POST /api/blob/upload` issues upload tokens only with an admin session. Vercel's upload-completed callback has no cookie; it is accepted only with a valid `x-vercel-signature` (HMAC with `BLOB_READ_WRITE_TOKEN`, verified by `@vercel/blob`). Logs contain the Blob pathname, never the full URL.
- `POST /api/blob/series-image-presign` requires an admin session.

## Anonymous visitor key

- The key lives in the browser's local storage. `VisitorKeySync` (root layout) copies it into the `readVisitorKey` cookie on every entry path. If the cookie had to be created on a server-rendered `/sermons/...` page, the page reloads once so the server can show overdue Content the visitor favorited.

## Share moderation

- `/admin/shares` lists stored Shares (newest 100 that are not deleted), including expired Shares that are still kept because a visitor favorited them.
- Removal is a Server Action (`removeShare`) whose first statement is `await requireAdmin()`, before any input is read or any data is touched; the page and the admin layout also call `requireAdmin()`. The button uses the shared `ConfirmSubmitButton` dialog, so nothing is sent until "确认删除" is pressed.
- Removal uses the same code as the owner's delete (`deleteShare` in `src/lib/shareLifecycle.ts`): the Share is soft-deleted and its favorites removed in one locked transaction, so it is unavailable immediately; Share retention deletes the row on its next run.
- There is no undo in the interface. Before the next cleanup run a removed Share can still be restored in the database by clearing `deletedAt` (its favorites are gone).

## Request hardening (Release 3, security part)

- **Security headers** (`next.config.mjs`, every response): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'` (the only CSP directive; scripts are not restricted because Next.js inline scripts would need nonces), a `Permissions-Policy` that turns off camera, microphone, location, payment and USB, and no `X-Powered-By`.
- **Admin sessions** accept a token only until its signed expiry, and only if that expiry is at most `ADMIN_SESSION_MAX_AGE_SECONDS` (8 hours) plus one minute ahead. A validly signed token with a later expiry was not issued by this server and is refused.
- **Admin login** reads at most 4 KB of JSON. A malformed body is a 400, an oversized one a 413, and the request body is never written to the logs (errors are logged by name only).
- **Uploads** (`/api/blob/upload`, admin only): the client token is issued only for `resources/<UUID><extension>` paths, is valid for 15 minutes, and carries the content-type allowlist from `src/lib/uploadPolicy.ts` (audio, JPG/PNG/WebP/GIF images, PDF, Word, PowerPoint, plain text) and the 100 MB limit; Vercel Blob enforces both. HTML, SVG, scripts and executables are refused. Upload and image-signing errors return a fixed message; details go to the server log without URLs.
- **Anonymous read marks** (`POST /api/contents/[id]/read`) are limited to 120 per hour per client address (HMAC key `content-read:<address>` in `LoginThrottle`), counted only for visible Content, before any row is written; bodies are limited to 2 KB.
- **Visitor keys** are sent in the `X-Visitor-Key` request header instead of the URL, so they no longer appear in request logs. The `visitorKey` query parameter is still read for pages opened before this change and can be removed later.
- **Public Share list** (`GET /api/shares`) returns at most the newest 100 public Shares plus the visitor's own favorited Shares.

## Vercel environments

- Production: `ADMIN_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `DATABASE_URL`, `SHARE_RETENTION_DELETE_ENABLED` (plus `MEMBER_ACCESS_CODE`, which no code reads since the member login was removed and can be deleted).
- Preview receives none of the secrets (the project has no Preview deployments). `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY` are public identifiers and stay available to all environments.
