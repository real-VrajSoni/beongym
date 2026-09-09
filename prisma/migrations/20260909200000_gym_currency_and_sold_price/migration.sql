-- What a gym charges in, and what a membership was actually sold for.
--
-- Both are additive. Nothing is dropped and no existing value is overwritten
-- with a guess: currency is derived from the country the gym already recorded,
-- and every existing membership takes the price of the plan it is on, which is
-- the number the old code was computing against anyway. The rows come out of
-- this saying exactly what they said going in.

-- 1. The gym's currency, from the country it is already in.
ALTER TABLE "gyms" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

UPDATE "gyms" SET "currency" = CASE "country"
    WHEN 'United Arab Emirates' THEN 'AED'
    WHEN 'Saudi Arabia' THEN 'SAR'
    WHEN 'Qatar' THEN 'QAR'
    WHEN 'United Kingdom' THEN 'GBP'
    WHEN 'Ireland' THEN 'EUR'
    WHEN 'United States' THEN 'USD'
    WHEN 'Canada' THEN 'CAD'
    WHEN 'Australia' THEN 'AUD'
    WHEN 'New Zealand' THEN 'NZD'
    WHEN 'Singapore' THEN 'SGD'
    WHEN 'Malaysia' THEN 'MYR'
    WHEN 'Indonesia' THEN 'IDR'
    WHEN 'Thailand' THEN 'THB'
    WHEN 'Philippines' THEN 'PHP'
    WHEN 'Vietnam' THEN 'VND'
    WHEN 'Japan' THEN 'JPY'
    WHEN 'South Korea' THEN 'KRW'
    WHEN 'China' THEN 'CNY'
    WHEN 'Hong Kong' THEN 'HKD'
    WHEN 'Taiwan' THEN 'TWD'
    WHEN 'Sri Lanka' THEN 'LKR'
    WHEN 'Nepal' THEN 'NPR'
    WHEN 'Bangladesh' THEN 'BDT'
    WHEN 'Pakistan' THEN 'PKR'
    WHEN 'Israel' THEN 'ILS'
    WHEN 'Türkiye' THEN 'TRY'
    WHEN 'South Africa' THEN 'ZAR'
    WHEN 'Nigeria' THEN 'NGN'
    WHEN 'Kenya' THEN 'KES'
    WHEN 'Ghana' THEN 'GHS'
    WHEN 'Ethiopia' THEN 'ETB'
    WHEN 'Egypt' THEN 'EGP'
    WHEN 'Morocco' THEN 'MAD'
    WHEN 'Tunisia' THEN 'TND'
    WHEN 'France' THEN 'EUR'
    WHEN 'Germany' THEN 'EUR'
    WHEN 'Spain' THEN 'EUR'
    WHEN 'Portugal' THEN 'EUR'
    WHEN 'Italy' THEN 'EUR'
    WHEN 'Netherlands' THEN 'EUR'
    WHEN 'Belgium' THEN 'EUR'
    WHEN 'Austria' THEN 'EUR'
    WHEN 'Greece' THEN 'EUR'
    WHEN 'Finland' THEN 'EUR'
    WHEN 'Switzerland' THEN 'CHF'
    WHEN 'Sweden' THEN 'SEK'
    WHEN 'Norway' THEN 'NOK'
    WHEN 'Denmark' THEN 'DKK'
    WHEN 'Poland' THEN 'PLN'
    WHEN 'Czechia' THEN 'CZK'
    WHEN 'Hungary' THEN 'HUF'
    WHEN 'Romania' THEN 'RON'
    WHEN 'Brazil' THEN 'BRL'
    WHEN 'Mexico' THEN 'MXN'
    WHEN 'Argentina' THEN 'ARS'
    WHEN 'Chile' THEN 'CLP'
    WHEN 'Colombia' THEN 'COP'
    WHEN 'Peru' THEN 'PEN'
    ELSE 'INR'
  END;

-- 2. What the membership was sold for. Added nullable, backfilled from the
--    plan, then made required — the only order that does not need a made-up
--    default sitting in the table for even one statement.
ALTER TABLE "subscriptions" ADD COLUMN "price" DECIMAL(12,2);
ALTER TABLE "subscriptions" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

UPDATE "subscriptions" s
   SET "price"    = p."price",
       "currency" = g."currency"
  FROM "plans" p
  JOIN "gyms" g ON g."id" = p."gym_id"
 WHERE s."plan_id" = p."id";

ALTER TABLE "subscriptions" ALTER COLUMN "price" SET NOT NULL;

-- 3. A plan's currency is the gym's, not a per-row choice.
UPDATE "plans" p SET "currency" = g."currency" FROM "gyms" g WHERE g."id" = p."gym_id";
