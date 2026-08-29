-- Recompute products.category from the taxonomy.
--
-- The seeder wrote the LEAF name into this column, so a bag of honey beans read
-- back as "Wake Gida" and a bag of rice as "Local White" - variety names where a
-- category belongs. That also broke the shop's filter chips, which intersect
-- this column against the root category list and so matched nothing.
--
-- Reads now derive both levels from the tree, but endpoints that select the
-- whole product row still return this column, so it has to be right.
--
-- Products with no category_id are left alone: there is nothing to derive from,
-- and overwriting them would discard whatever an admin typed.

WITH RECURSIVE ancestry AS (
  SELECT id AS leaf_id, id AS node_id, parent_id, name
  FROM product_categories

  UNION ALL

  SELECT a.leaf_id, p.id, p.parent_id, p.name
  FROM ancestry a
  JOIN product_categories p ON p.id = a.parent_id
),
roots AS (
  SELECT leaf_id, name AS root_name
  FROM ancestry
  WHERE parent_id IS NULL
)
UPDATE product AS pr
SET category = roots.root_name
FROM roots
WHERE pr.category_id = roots.leaf_id
  AND pr.category IS DISTINCT FROM roots.root_name;
