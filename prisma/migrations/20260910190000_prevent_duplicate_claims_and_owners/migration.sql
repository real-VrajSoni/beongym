-- A listing may have only one claim checkout in progress at a time.
-- The partial predicate releases the listing after a failed/cancelled checkout,
-- while preventing two browsers from opening paid claim sessions concurrently.
CREATE UNIQUE INDEX "platform_orders_one_pending_claim_per_gym" ON "platform_orders" ("gym_id")
WHERE "kind" = 'CLAIM'
    AND "status" = 'PENDING';
-- One tenant has one account with owner-level authority. Staff remain unlimited.
CREATE UNIQUE INDEX "users_one_gym_owner_per_gym" ON "users" ("gym_id")
WHERE "role" = 'GYM_OWNER';