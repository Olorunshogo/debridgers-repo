-- Push products down from their TYPE node onto their VARIETY leaf.
--
-- 0015 matched products by their old flat category text, which could only ever
-- reach the type: "Ofada Rice" landed on Rice, not on Rice > Ofada. That left the
-- grains branch drilling two levels in practice while the leaves sat empty, which
-- defeats the point of the three-level model.
--
-- The rule: for a product currently sitting on a node that HAS children, look for
-- a child whose name appears in the product name. Applied only when EXACTLY ONE
-- child matches. "Wake Gida (Honey Beans)" names two varieties and is therefore
-- left on Beans rather than guessed at, on the same principle as the bank-code
-- backfill: a wrong answer is worse than an unspecific one.
UPDATE "products" p
SET "category_id" = m.leaf_id
FROM (
	SELECT p2.id AS product_id, MIN(l.id) AS leaf_id
	FROM "products" p2
	JOIN "product_categories" cur ON cur.id = p2."category_id"
	JOIN "product_categories" l ON l.parent_id = cur.id
	WHERE lower(p2."name") LIKE '%' || lower(l."name") || '%'
	  AND EXISTS (
		SELECT 1 FROM "product_categories" ch WHERE ch.parent_id = cur.id
	  )
	GROUP BY p2.id
	HAVING count(*) = 1
) AS m
WHERE p.id = m.product_id;
