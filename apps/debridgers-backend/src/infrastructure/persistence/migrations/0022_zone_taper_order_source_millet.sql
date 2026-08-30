-- Three corrections that all needed the database rather than the seeder.
-- Derivation for the delivery figures: docs/business/BusinessModel.md.

-- === Per-zone delivery taper
--
-- One taper for every zone under-charged the far ones: distance changes what a
-- marginal package costs, not only what the trip costs. Defaults are the
-- Kaduna South figures, which is what every zone was priced at before this.

ALTER TABLE zones ADD COLUMN IF NOT EXISTS tier_one_per_package_kobo integer NOT NULL DEFAULT 70000;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS tier_two_per_package_kobo integer NOT NULL DEFAULT 40000;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS delivery_cap_kobo integer NOT NULL DEFAULT 1000000;

UPDATE zones SET
  tier_one_per_package_kobo = 70000,
  tier_two_per_package_kobo = 40000,
  delivery_cap_kobo = 1000000
WHERE name = 'Kaduna South';

UPDATE zones SET
  tier_one_per_package_kobo = 80000,
  tier_two_per_package_kobo = 45000,
  delivery_cap_kobo = 1100000
WHERE name = 'Kaduna North';

UPDATE zones SET
  tier_one_per_package_kobo = 100000,
  tier_two_per_package_kobo = 60000,
  delivery_cap_kobo = 1400000
WHERE name = 'Chikun';

-- === Order source
--
-- Recorded rather than inferred from which columns happen to be null, so
-- reporting does not depend on that inference continuing to hold.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_source') THEN
    CREATE TYPE order_source AS ENUM ('self_serve', 'assisted', 'agent');
  END IF;
END
$$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source order_source NOT NULL DEFAULT 'self_serve';

-- Backfill: an order carrying an agent came through an agent. Everything else
-- predates assisted checkout, so it was self-serve by definition.
UPDATE orders SET order_source = 'agent' WHERE agent_id IS NOT NULL AND order_source = 'self_serve';

-- === Millet's category
--
-- 0021 inserted the millet product but could not place it: this database's
-- taxonomy predates the Millet node in catalog.ts, so the leaf did not exist
-- and the product landed Uncategorized.

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
  AND root.name = 'Grains';
