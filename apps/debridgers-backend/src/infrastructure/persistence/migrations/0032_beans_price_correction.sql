-- Wake Gida (Honey Beans) priced at 300 naira per 100kg bag for testing.
--
-- The seeder only ever applies to an empty database, so an existing database
-- needs this correction as well or the fix ships to no one.
--
-- Every statement is idempotent, so re-running changes nothing.

UPDATE product
SET price_kobo = 30000
WHERE name = 'Wake Gida (Honey Beans)' AND price_kobo <> 30000;
