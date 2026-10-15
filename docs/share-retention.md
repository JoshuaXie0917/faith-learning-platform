# Share retention cron

`/api/cron/share-retention` runs once daily at 08:00 UTC (the exact invocation time depends on the Vercel plan). It handles Shares only. Each enabled invocation deletes at most 100 Shares that are either:

- **deleted** by their owner or an admin (soft-deleted), whether or not anyone favorited them; or
- **expired** with no `ShareFavorite`. An expired Share with a favorite stays stored (and visible to the visitors who favorited it); after its last favorite is removed, it can be deleted on a later run.

Cleanup compares UTC timestamps and uses the later of the stored `expiresAt` and `createdAt + 168 hours` as the effective expiry, so legacy rows are never shortened by a daylight-saving-time boundary.

Explicit deletion takes effect immediately, before cleanup runs (`src/lib/shareLifecycle.ts`): in one transaction the Share row is locked, soft-deleted and all of its favorites are removed. It disappears from every public list and detail view at once, no favorite can keep it stored, and no visitor keeps a favorite slot for it. Only favorites of Shares that are not deleted, and of Content that is published and not deleted, count toward the 30-favorite limit. A visitor can favorite only a Share they can see: one still in its public window, or one they already favorited.

Required Production configuration (do not put values in this repository):

- `DATABASE_URL`: the PostgreSQL database where the Share-retention index migration has been applied.
- `CRON_SECRET`: a random secret of at least 16 characters. Vercel sends it as `Authorization: Bearer <CRON_SECRET>`. The route rejects requests if it is absent or wrong.
- `SHARE_RETENTION_DELETE_ENABLED`: deletion is disabled unless this is exactly `true`. Leave it unset or `false` while reviewing dry-run output.

An authenticated `GET /api/cron/share-retention?dryRun=true` works while deletion is disabled. The only accepted query shapes are no parameters (normal cron behavior) or exactly one `dryRun=true` entry (read-only dry-run). Any other parameter name or value, including misspellings, different capitalization, malformed values, duplicates, or additional parameters, returns HTTP 400 before cleanup database work. Dry-run returns the total eligible count and at most 100 Share IDs, stored and effective expiry timestamps, soft-delete flags, and favorite counts (a soft-deleted Share can be listed with favorites from before this rule; deletion removes them); it does not write to the database. An ordinary authenticated GET returns `enabled: false` until the deletion flag is enabled. `HEAD` always returns HTTP 405 and cannot run cleanup.

Before enabling deletion, run the expiry, favorite, concurrency, overlap, dry-run, and authorization tests against a disposable PostgreSQL database. Apply `20260929120000_add_share_retention_index` to the intended database before enabling deletion. Review dry-run results, then enable the flag separately. Monitor failures and rerun safely if needed; the transaction-scoped lock prevents overlapping runs from processing the same batch. This job does not delete Content or Blob objects.
