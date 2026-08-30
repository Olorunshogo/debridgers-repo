-- Record whether an account is still on the password it was issued.
--
-- The invite flow generates a temporary password and emails it in plaintext,
-- but nothing recorded that the password was temporary. The dashboard's nag
-- was therefore a client-side ref that reset on every reload and fired for
-- every admin, including ones who changed their password long ago, because
-- there was nothing to check against.
--
-- This column is that missing check. The invite sets it, changing the password
-- clears it, and the UI is a pure rendering of it: closing the reminder stores
-- nothing, so it returns on reload and on any other device until the password
-- actually changes.

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false;

-- Lets a later escalation ("this has been outstanding too long") be written
-- without another migration, and gives support a straight answer.
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;

-- Existing sub-admins all arrived through the invite flow, and no record
-- exists of which of them have since changed their password. Flagging them is
-- the safe direction to be wrong in: someone who already set a good password
-- is asked once more, whereas the reverse leaves an emailed plaintext password
-- live and unflagged.
--
-- Super admins are excluded: they were seeded, not invited, so they were never
-- issued a temporary password.
UPDATE "users"
SET "must_change_password" = true
WHERE "role" = 'admin'
  AND "admin_tier" = 'sub';
