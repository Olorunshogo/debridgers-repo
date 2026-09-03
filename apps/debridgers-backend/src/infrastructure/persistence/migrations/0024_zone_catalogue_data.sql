-- Data corrections that the seeders only ever apply to an empty database.
--
-- Migrations 0021 and 0022 carried these. Regenerating the migration set into
-- 0000, 0001 and 0023 reproduced their schema changes but dropped every data
-- statement in them, so a rebuilt database came back with a 500 naira zone
-- base, bags labelled 25kg that hold 100kg, and millet unlisted. This restores
-- the lot and supersedes both.
--
-- Every statement is idempotent, so re-running changes nothing.
--
-- Derivation for the delivery figures: docs/business/BusinessModel.md.
-- The taper band: docs/frontend/Refactor.md, decision X6.

-- === Zone base fees
--
-- The base covers two packages and is set to the measured trip cost, not an
-- estimate. Kaduna South was measured at 4,000 naira for a two-package outbound
-- leg. The previous 500 naira base recovered an eighth of that, which is why
-- every small order lost money.

UPDATE zones SET delivery_fee = 400000 WHERE name = 'Kaduna South';
UPDATE zones SET delivery_fee = 450000 WHERE name = 'Kaduna North';
UPDATE zones SET delivery_fee = 600000 WHERE name = 'Chikun';

-- === Per-zone delivery taper
--
-- One taper for every zone under-charged the far ones: distance changes what a
-- marginal package costs, not only what the trip costs.
--
-- These are the locked rates mapped into the 500 to 600 naira operating band,
-- per decision X6. The descent survives at every zone, which is the mechanism:
-- packages 3 to 6 cost more each than packages 7 and up, because the cost is
-- the trip rather than the bag.
--
-- To restore the locked schedule, set the band endpoints in
-- packages/pricing/src/delivery-fee.ts back to the locked range and reissue
-- these three statements from the values that function then produces.

UPDATE zones SET
  tier_one_per_package_kobo = 55000,
  tier_two_per_package_kobo = 50000,
  delivery_cap_kobo = 1000000
WHERE name = 'Kaduna South';

UPDATE zones SET
  tier_one_per_package_kobo = 56500,
  tier_two_per_package_kobo = 51000,
  delivery_cap_kobo = 1100000
WHERE name = 'Kaduna North';

UPDATE zones SET
  tier_one_per_package_kobo = 60000,
  tier_two_per_package_kobo = 53500,
  delivery_cap_kobo = 1400000
WHERE name = 'Chikun';

-- === Chikun zone definition
--
-- Kachia, Kafanchan, Kagoro and Jema'a were listed here at a 800 naira base.
-- None are in Chikun LGA and all are 80 to 120km out, so a single drop lost
-- more than the entire margin on the goods. They belong in an inter-city zone
-- quoted per trip, not in a metro zone.

UPDATE zones
SET
  description = 'Chikun LGA - Kujama, Sabon Sarki, Nasarawa, Ungwan Yero',
  areas = ARRAY['Kujama', 'Sabon Sarki', 'Nasarawa', 'Ungwan Yero']
WHERE name = 'Chikun';

-- === Unit sizes
--
-- Apart from rice, the bags are 100kg. A buyer told 50kg or 25kg who receives
-- 100kg is being given away half the goods; the reverse is a misdescription.
-- Prices are unaffected: the price is the price whatever the bag weighs.

UPDATE product
SET
  unit = '100kg bag',
  description = 'Freshly processed white garri. Sold per 100kg bag.'
WHERE name = 'White Garri' AND unit <> '100kg bag';

UPDATE product
SET
  unit = '100kg bag',
  description = 'Toasted yellow garri with rich flavour. Sold per 100kg bag.'
WHERE name = 'Yellow Garri (Toasted)' AND unit <> '100kg bag';

UPDATE product SET unit = '100kg bag'
WHERE name IN ('Wake Gida (Honey Beans)', 'Cowpea (White Beans)', 'Irish Potato')
  AND unit <> '100kg bag';

-- === Millet
--
-- Purchased and resold before it was ever listed, so it could not be ordered,
-- costed or reported on.
--
-- Only added to a catalogue that already exists. The seeder skips a product
-- table that is not empty, so inserting this into a fresh database would leave
-- millet as the entire catalogue and suppress every other product.

INSERT INTO product (name, unit, price_kobo, description, category, is_active, sort_order)
SELECT
  'Millet',
  '100kg bag',
  4000000,
  'Locally sourced millet grain. Sold per 100kg bag.',
  'Uncategorized',
  true,
  12
WHERE EXISTS (SELECT 1 FROM product)
  AND NOT EXISTS (SELECT 1 FROM product WHERE name = 'Millet');

-- The leaf node, which this database's taxonomy predates.
INSERT INTO product_categories (name, slug, parent_id, sort_order, is_active, created_at)
SELECT 'Millet', 'millet', g.id, 0, true, NOW()
FROM product_categories g
WHERE g.name = 'Grains'
  AND g.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_categories m WHERE m.name = 'Millet' AND m.parent_id = g.id
  );

-- `category` holds the root name and `category_id` the leaf, matching how every
-- other product in this table is placed.
UPDATE product p
SET category_id = leaf.id, category = 'Grains'
FROM product_categories leaf
JOIN product_categories root ON root.id = leaf.parent_id
WHERE p.name = 'Millet'
  AND leaf.name = 'Millet'
  AND root.name = 'Grains'
  AND p.category_id IS DISTINCT FROM leaf.id;

-- === Order source backfill
--
-- An order carrying an agent came through an agent. Everything else predates
-- assisted checkout, so it was self-serve by definition.

UPDATE orders SET order_source = 'agent'
WHERE agent_id IS NOT NULL AND order_source = 'self_serve';
