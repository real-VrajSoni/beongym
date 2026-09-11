ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "rate_limit_buckets" (
  "key" TEXT PRIMARY KEY,
  "hits" INTEGER NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL
);
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets" ("expires_at");
