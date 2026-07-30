CREATE TABLE IF NOT EXISTS "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" integer,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Slug is unique per parent, not globally: "White" is a valid variety under both
-- Garri and Beans. COALESCE because a NULL parent (top level) would otherwise
-- make every top-level row distinct under a plain unique index.
CREATE UNIQUE INDEX IF NOT EXISTS "product_categories_parent_slug_idx" ON "product_categories" ("slug", COALESCE("parent_id", 0));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_parent_idx" ON "product_categories" ("parent_id");--> statement-breakpoint

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Seed the taxonomy.
--
-- The pre-existing products.category values were a mix of levels: Rice, Beans
-- and Garri are types of Grains, while Oil and Tubers are top-level categories.
-- Seeding the real shape here is what lets the backfill below attach existing
-- products to the correct depth instead of flattening them.
INSERT INTO "product_categories" ("name", "slug", "parent_id", "sort_order") VALUES
	('Grains', 'grains', NULL, 1),
	('Oil', 'oil', NULL, 2),
	('Tubers', 'tubers', NULL, 3)
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Level 2 under Grains
INSERT INTO "product_categories" ("name", "slug", "parent_id", "sort_order")
SELECT v.name, v.slug, g.id, v.sort_order
FROM (VALUES
	('Rice', 'rice', 1),
	('Beans', 'beans', 2),
	('Garri', 'garri', 3)
) AS v(name, slug, sort_order)
CROSS JOIN (SELECT id FROM "product_categories" WHERE slug = 'grains' AND parent_id IS NULL) AS g
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Level 3: rice varieties
INSERT INTO "product_categories" ("name", "slug", "parent_id", "sort_order")
SELECT v.name, v.slug, p.id, v.sort_order
FROM (VALUES
	('Local White', 'local-white', 1),
	('Ofada', 'ofada', 2),
	('Tuwo', 'tuwo', 3),
	('Long Grain', 'long-grain', 4)
) AS v(name, slug, sort_order)
CROSS JOIN (
	SELECT c.id FROM "product_categories" c
	JOIN "product_categories" pa ON pa.id = c.parent_id
	WHERE c.slug = 'rice' AND pa.slug = 'grains'
) AS p
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Level 3: bean varieties
INSERT INTO "product_categories" ("name", "slug", "parent_id", "sort_order")
SELECT v.name, v.slug, p.id, v.sort_order
FROM (VALUES
	('Wake Gida', 'wake-gida', 1),
	('Cowpea', 'cowpea', 2),
	('Soya Beans', 'soya-beans', 3),
	('Ameria', 'ameria', 4),
	('Honey Beans', 'honey-beans', 5)
) AS v(name, slug, sort_order)
CROSS JOIN (
	SELECT c.id FROM "product_categories" c
	JOIN "product_categories" pa ON pa.id = c.parent_id
	WHERE c.slug = 'beans' AND pa.slug = 'grains'
) AS p
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Level 3: garri varieties
INSERT INTO "product_categories" ("name", "slug", "parent_id", "sort_order")
SELECT v.name, v.slug, p.id, v.sort_order
FROM (VALUES
	('White', 'white', 1),
	('Yellow', 'yellow', 2),
	('Ijebu', 'ijebu', 3)
) AS v(name, slug, sort_order)
CROSS JOIN (
	SELECT c.id FROM "product_categories" c
	JOIN "product_categories" pa ON pa.id = c.parent_id
	WHERE c.slug = 'garri' AND pa.slug = 'grains'
) AS p
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Level 2 under Oil: oils are sold directly, so these are leaves at depth 2.
INSERT INTO "product_categories" ("name", "slug", "parent_id", "sort_order")
SELECT v.name, v.slug, o.id, v.sort_order
FROM (VALUES
	('Palm Oil', 'palm-oil', 1),
	('Groundnut Oil', 'groundnut-oil', 2),
	('Vegetable Oil', 'vegetable-oil', 3)
) AS v(name, slug, sort_order)
CROSS JOIN (SELECT id FROM "product_categories" WHERE slug = 'oil' AND parent_id IS NULL) AS o
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Level 2 under Tubers, likewise leaves at depth 2.
INSERT INTO "product_categories" ("name", "slug", "parent_id", "sort_order")
SELECT v.name, v.slug, t.id, v.sort_order
FROM (VALUES
	('Yam', 'yam', 1),
	('Irish Potato', 'irish-potato', 2),
	('Sweet Potato', 'sweet-potato', 3)
) AS v(name, slug, sort_order)
CROSS JOIN (SELECT id FROM "product_categories" WHERE slug = 'tubers' AND parent_id IS NULL) AS t
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Backfill existing products.
--
-- Step 1: exact leaf-name match. Catches a product literally named after its
-- variety, e.g. "Ofada" or "Palm Oil".
UPDATE "products" p
SET "category_id" = c.id
FROM "product_categories" c
WHERE p."category_id" IS NULL
  AND lower(trim(p."name")) = lower(c."name")
  AND NOT EXISTS (SELECT 1 FROM "product_categories" ch WHERE ch."parent_id" = c."id");--> statement-breakpoint

-- Step 2: attach whatever is left to the node matching its old flat category
-- text. Lands on the type node (Rice/Beans/Garri) or the top-level category
-- (Oil/Tubers), which is exactly as specific as the old data actually was.
UPDATE "products" p
SET "category_id" = c.id
FROM "product_categories" c
WHERE p."category_id" IS NULL
  AND p."category" IS NOT NULL
  AND lower(trim(p."category")) = lower(c."name");--> statement-breakpoint

-- Step 3: re-derive the flat products.category from each product's ROOT
-- ancestor.
--
-- The old values mixed levels ("Rice" sat alongside "Oil"), so the shop's filter
-- chips could never agree with the tree. Rewriting them to the root name means a
-- rice product now files under Grains, matching the chips the shop offers. The
-- column stays for the shop filter; category_id is the real taxonomy.
WITH RECURSIVE ancestry AS (
	SELECT id, id AS node_id, parent_id, name
	FROM "product_categories"
	UNION ALL
	SELECT a.id, c.id AS node_id, c.parent_id, c.name
	FROM ancestry a
	JOIN "product_categories" c ON c.id = a.parent_id
)
UPDATE "products" p
SET "category" = roots.name
FROM (
	SELECT id, name FROM ancestry WHERE parent_id IS NULL
) AS roots
WHERE p."category_id" = roots.id;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" ("category_id");
