-- The seeder only populates an empty zones table, so a database that already
-- has zone rows (every real one) never gets the new catch-all zone from
-- seeder.ts on its own. This inserts it directly, idempotently - safe to
-- run again, and a no-op on a fresh database the seeder already covered.

INSERT INTO zones (
  name,
  description,
  delivery_fee,
  tier_one_per_package_kobo,
  tier_two_per_package_kobo,
  delivery_cap_kobo,
  requires_quote,
  areas,
  is_active
)
SELECT
  'Other Kaduna LGAs',
  'Any Kaduna State LGA outside the three priced metro zones above',
  0,
  0,
  0,
  0,
  true,
  ARRAY[]::text[],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM zones WHERE name = 'Other Kaduna LGAs'
);
