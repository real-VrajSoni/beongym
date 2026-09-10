-- The fallback currency stops being the rupee.
--
-- It was INR on the reasoning that most of these gyms are Indian. That is not a
-- default so much as an assumption, and it failed silently: a gym in Norway
-- whose city the gazetteer did not recognise came out priced in rupees with no
-- sign anything had gone wrong. A neutral fallback is wrong more often and
-- wrong visibly, which is the trade worth making — nobody in Oslo mistakes
-- dollars for their own money.
--
-- This changes the DEFAULT only. Not one existing row is rewritten: every gym
-- already trading in rupees keeps its rupees, and the four columns below only
-- ever apply to rows written from here on, where the gym is asked outright.
ALTER TABLE "gyms"          ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "plans"         ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "subscriptions" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "payments"      ALTER COLUMN "currency" SET DEFAULT 'USD';
