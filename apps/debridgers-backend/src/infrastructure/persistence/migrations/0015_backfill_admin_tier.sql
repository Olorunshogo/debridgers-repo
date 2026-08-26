-- Give existing admins a tier.
--
-- AdminKeyGuard authorises from users.admin_tier, but the token signer defaults
-- a null tier to "super" (auth.service.ts). An admin seeded before the column
-- existed therefore logged in successfully and then got 401 on every admin
-- endpoint: the JWT claimed super, the column said nothing.
--
-- Existing admins become super. A sub-admin is only ever created through the
-- invite flow, which sets the tier explicitly, so there is no one here to
-- wrongly promote.

UPDATE "users"
SET "admin_tier" = 'super'
WHERE "role" = 'admin'
  AND "admin_tier" IS NULL;
