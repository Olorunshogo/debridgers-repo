-- Update admin user tier to 'super'
UPDATE "users"
SET "admin_tier" = 'super'
WHERE "email" = 'admin@debridgers.com';
