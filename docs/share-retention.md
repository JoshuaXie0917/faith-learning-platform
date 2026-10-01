# Share retention cron

`/api/cron/share-retention` runs once daily at 08:00 UTC (the exact invocation time depends on the Vercel plan). It handles Shares only. Each enabled invocation deletes at most 100 expired Shares with no `ShareFavorite`, including soft-deleted Shares. A Share with any favorite remains stored; after its last favorite is removed, it can be deleted on a later run. Cleanup compares UTC timestamps and uses the later of the stored `expiresAt` and `createdAt + 168 hours` as the effective deadline, so legacy rows are never shortened by a daylight-saving-time boundary.

Required Production configuration (do not put values in this repository):

- `DATABASE_URL`: the PostgreSQL database where the Share-retention index migration has been applied.
- `CRON_SECRET`: a random secret of at least 16 characters. Vercel sends it as `Authorization: Bearer <CRON_SECRET>`. The route rejects requests if it is absent or wrong.
- `SHARE_RETENTION_DELETE_ENABLED`: deletion is disabled unless this is exactly `true`. Leave it unset or `false` while reviewing dry-run output.

An authenticated `GET /api/cron/share-retention?dryRun=true` works while deletion is disabled. The only accepted query shapes are no parameters (normal cron behavior) or exactly one `dryRun=true` entry (read-only dry-run). Any other parameter name or value, including misspellings, different capitalization, malformed values, duplicates, or additional parameters, returns HTTP 400 before cleanup database work. Dry-run returns the total eligible count and at most 100 Share IDs, stored and effective expiry timestamps, soft-delete flags, and favorite counts; it does not write to the database. An ordinary authenticated GET returns `enabled: false` until the deletion flag is enabled. `HEAD` always returns HTTP 405 and cannot run cleanup.

Before enabling deletion, run the expiry, favorite, concurrency, overlap, dry-run, and authorization tests against a disposable PostgreSQL database. Apply `20260929120000_add_share_retention_index` to the intended database before enabling deletion. Review dry-run results, then enable the flag separately. Monitor failures and rerun safely if needed; the transaction-scoped lock prevents overlapping runs from processing the same batch. This job does not delete Content or Blob objects.
