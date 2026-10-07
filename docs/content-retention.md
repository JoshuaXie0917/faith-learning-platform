# Content retention

Rules live in `src/lib/contentRetention.ts` (visibility) and `src/lib/contentRetentionCleanup.ts` (cleanup job).

## Policy

- **Clock:** `Content.createdAt`, six calendar months, UTC. Month ends clamp like PostgreSQL (`31 August − 6 months = 28/29 February`).
- **Legacy floor:** nothing is overdue, hidden by age, or deleted before **2027-03-30T03:00:00Z** (2027-03-30 00:00 America/Halifax), so returning visitors can still sync browser favorites until then.
- **Public visibility** (every public page and API uses `publicContentWhere`):
  - published Content younger than six months is public;
  - overdue published Content is shown only to visitors who favorited it (matched by the `readVisitorKey` cookie the browser mirrors from local storage);
  - soft-deleted Content is never public; drafts are never public;
  - admin pages are unaffected.
- **Hard deletion** (cleanup job only):
  - published, not deleted, overdue, and **no** `ContentFavorite` at all; removing the last favorite makes it eligible on the next run;
  - soft-deleted Content (any status): eligible at the later of `createdAt + 6 months` and `deletedAt + 30 days`, regardless of favorites;
  - drafts that are not soft-deleted are never deleted automatically.
- Deleting a Content row cascades to `ContentFavorite`, `ContentRead`, and `CheckIn` (optional foreign key `CheckIn.sermonId`).

## Cleanup route

`GET /api/cron/content-retention`, daily at 09:00 UTC from `vercel.json`.

- **Auth:** `Authorization: Bearer <CRON_SECRET>` (sent by Vercel Cron). The admin cookie is not accepted. `HEAD` returns 405.
- **Query:** no parameters, or exactly one `dryRun=true`. Anything else returns 400 before database work.
- **Dry run** (`?dryRun=true`): read-only. Returns the cutoffs, the eligible count, up to 25 candidates (ID, `createdAt`, status, soft-delete flag, favorite count, whether a Blob URL is present and in scope), outbox counts, and whether deletion would be allowed. No URLs or text.
- **Deletion** runs only when all of these hold; otherwise the route returns `enabled: false` with a reason and writes nothing:
  - `CONTENT_RETENTION_DELETE_ENABLED` is exactly `true`;
  - `CONTENT_RETENTION_DELETE_NOT_BEFORE` is a UTC ISO timestamp (for example `2027-03-30T03:00:00Z`); missing or malformed fails closed;
  - `BLOB_READ_WRITE_TOKEN` is present and well formed (`vercel_blob_rw_<storeId>_…`); it defines the only Blob store the job may clean, so missing or malformed fails closed;
  - the current time is at or after both that setting and the legacy floor.
- **Phase 1** (one transaction, at most 25 rows): transaction-scoped advisory lock `(17474, 2)` against overlapping runs, `SELECT … FOR UPDATE SKIP LOCKED`, then a `DELETE` that rechecks the full rule (including favorites). In-scope Blob URLs of deleted rows go into `BlobDeletionOutbox`. No Blob call happens inside the transaction.
- **Phase 2** (after commit, at most 25 outbox rows): each row is claimed for 10 minutes. The Blob is deleted only if its URL is on this project's own public Blob host (`<storeId>.public.blob.vercel-storage.com`, from the token's store ID) under `resources/` and no remaining Content row (soft-deleted included: `resourceUrl`, `description`, `contentBody`) or Series row (`imageUrl`, `description`) still contains its path, in any spelling. Failures retry with backoff (1 hour doubling, up to 24 hours) and stop after 8 attempts (`outbox.stuck`).
- **Not in scope:** Series images, abandoned or replaced uploads, and Blobs referenced only from text fields are never deleted by this job.

## Enabling deletion (on or after 2027-03-30)

1. Apply migration `20261007120000_add_content_retention_support` to the confirmed production database.
2. Deploy, then review `GET /api/cron/content-retention?dryRun=true` (with the cron secret) and the read-only aggregates.
3. Add `CONTENT_RETENTION_DELETE_NOT_BEFORE` and `CONTENT_RETENTION_DELETE_ENABLED=true` to Production only, redeploy, and watch the next run's log line and response.
