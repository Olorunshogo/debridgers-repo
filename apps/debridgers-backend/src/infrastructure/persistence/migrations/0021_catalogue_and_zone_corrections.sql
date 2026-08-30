-- Corrects catalogue and delivery data that the seeders only ever apply to an
-- empty database. The code was fixed; these rows were not, so production still
-- ran a 500 naira zone base and sold 100kg bags labelled 25kg.
--
-- Derivation for every figure: docs/business/BusinessModel.md.

-- === Zone base fees
--
-- The base covers two packages and is set to the measured trip cost, not an
-- estimate. The previous 500 naira base recovered an eighth of a real outbound
-- leg, which is why every small order lost money.

UPDATE zones SET delivery_fee = 400000 WHERE name = 'Kaduna South';
UPDATE zones SET delivery_fee = 450000 WHERE name = 'Kaduna North';
UPDATE zones SET delivery_fee = 600000 WHERE name = 'Chikun';

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
WHERE name = 'White Garri';

UPDATE product
SET
  unit = '100kg bag',
  description = 'Toasted yellow garri with rich flavour. Sold per 100kg bag.'
WHERE name = 'Yellow Garri (Toasted)';

UPDATE product SET unit = '100kg bag'
WHERE name IN ('Wake Gida (Honey Beans)', 'Cowpea (White Beans)', 'Irish Potato')
  AND unit <> '100kg bag';

-- === Millet
--
-- Purchased and resold before it was ever listed, so it could not be ordered,
-- costed or reported on. Inserted only when absent so a re-run is a no-op.

INSERT INTO product (name, unit, price_kobo, description, category, is_active, sort_order)
SELECT
  'Millet',
  '100kg bag',
  4000000,
  'Locally sourced millet grain. Sold per 100kg bag.',
  'Uncategorized',
  true,
  12
WHERE NOT EXISTS (SELECT 1 FROM product WHERE name = 'Millet');

UPDATE product
SET category_id = c.id, category = c.name
FROM product_categories c
WHERE product.name = 'Millet'
  AND c.name = 'Millet'
  AND product.category_id IS DISTINCT FROM c.id;
