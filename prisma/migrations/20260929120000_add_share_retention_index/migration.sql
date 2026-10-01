-- Support bounded Share cleanup in expiry/ID order without changing existing data.
CREATE INDEX "Share_expiresAt_id_idx" ON "Share"("expiresAt", "id");
