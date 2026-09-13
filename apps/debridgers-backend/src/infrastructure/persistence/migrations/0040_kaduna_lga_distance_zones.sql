-- Reprice the three existing metro zones by distance from the Narayi warehouse,
-- retire the old unpriced catch-all, and add one zone per remaining Kaduna LGA.
-- Existing ids are updated in place (orders reference them by zone_id); the
-- catch-all is deleted since no order references it.
UPDATE "zones" SET "distance_km" = 5, "areas" = ARRAY['Kakuri','Barnawa','Tudun Wada','Katuru','Mando','Makera','Unguwan Shanu','Romi','Kabala Costain'] WHERE "name" = 'Kaduna South';--> statement-breakpoint
UPDATE "zones" SET "distance_km" = 10, "areas" = ARRAY['Rigasa','Badiko','Kabala','Unguwan Sarki','Unguwan Rimi','Sabo','Kawo','Unguwan Mu''azu'] WHERE "name" = 'Kaduna North';--> statement-breakpoint
UPDATE "zones" SET "distance_km" = 2, "areas" = ARRAY['Sabon Tasha','Sabo','Kamazou','Television','Gonin Gora','Kigo','Unguwan Dosa','Narayi','Highcost'] WHERE "name" = 'Chikun';--> statement-breakpoint
DELETE FROM "zones" WHERE "name" = 'Other Kaduna LGAs';--> statement-breakpoint
INSERT INTO "zones" ("name", "description", "distance_km", "areas", "is_active") VALUES
  ('Igabi', NULL, 20, ARRAY['Afaka','Zaria Road','Igabi Town','Jagindi','Rigachikun'], true),
  ('Giwa', NULL, 35, ARRAY[]::text[], true),
  ('Kajuru', NULL, 35, ARRAY[]::text[], true),
  ('Kagarko', NULL, 45, ARRAY[]::text[], true),
  ('Zaria', 'Sourced road distance', 78, ARRAY['Zaria City','Sabon Gari','Tudun Wada','Kwarbai'], true),
  ('Sabon Gari', NULL, 78, ARRAY[]::text[], true),
  ('Kudan', NULL, 85, ARRAY[]::text[], true),
  ('Makarfi', NULL, 85, ARRAY[]::text[], true),
  ('Soba', NULL, 90, ARRAY[]::text[], true),
  ('Ikara', NULL, 100, ARRAY[]::text[], true),
  ('Kubau', NULL, 100, ARRAY[]::text[], true),
  ('Lere', NULL, 105, ARRAY[]::text[], true),
  ('Kauru', NULL, 115, ARRAY[]::text[], true),
  ('Zangon Kataf', NULL, 120, ARRAY[]::text[], true),
  ('Birnin Gwari', 'Sourced road distance', 122, ARRAY[]::text[], true),
  ('Kachia', 'Sourced road distance', 134, ARRAY[]::text[], true),
  ('Jaba', NULL, 140, ARRAY[]::text[], true),
  ('Sanga', NULL, 150, ARRAY[]::text[], true),
  ('Jema''a', NULL, 155, ARRAY[]::text[], true),
  ('Kaura', NULL, 165, ARRAY[]::text[], true);
