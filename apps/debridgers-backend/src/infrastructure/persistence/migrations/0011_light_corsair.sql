ALTER TABLE "products" ADD COLUMN "weight_grams" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
/*
  Backfill shipping weights for the launch catalogue.

  Derived per product rather than parsed from `unit`: that column mixes mass
  ("50kg bag"), volume ("25 litre keg"), count ("100 tubers") and an unparseable
  label ("Full Jumbo Bag"). Oil is converted from litres using a density of
  ~0.9 kg/L; tubers and the jumbo bag are estimates and should be corrected by
  whoever actually weighs them.
*/
UPDATE "products" SET "weight_grams" = 50000 WHERE "unit" = '50kg bag';
--> statement-breakpoint
UPDATE "products" SET "weight_grams" = 25000 WHERE "unit" = '25kg bag';
--> statement-breakpoint
UPDATE "products" SET "weight_grams" = 22500 WHERE "unit" = '25 litre keg';
--> statement-breakpoint
UPDATE "products" SET "weight_grams" = 80000 WHERE "unit" = '100 tubers';
--> statement-breakpoint
UPDATE "products" SET "weight_grams" = 100000 WHERE "unit" = 'Full Jumbo Bag';
