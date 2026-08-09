ALTER TABLE "audit_log" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "audit_log" CASCADE;--> statement-breakpoint
ALTER TABLE "admin_api_keys" ALTER COLUMN "admin_id" SET DATA TYPE integer;--> statement-breakpoint
/*
 Hand-added, and the point of this migration. drizzle-kit emits only the
 SET DATA TYPE above, which is a no-op: a `serial` column is already `integer`
 underneath, plus a sequence, plus a DEFAULT nextval() pointing at it. Without
 these two statements the default survives, an INSERT omitting admin_id still
 silently takes the next sequence value, and the whole defect this migration
 exists to fix remains in place.

 Same class of gap as the USING clause needed in 0004. Read the generated SQL
 for any migration that changes a column type; drizzle-kit's serial handling is
 not complete.
*/
ALTER TABLE "admin_api_keys" ALTER COLUMN "admin_id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "admin_api_keys_admin_id_seq";--> statement-breakpoint
ALTER TABLE "admin_api_keys" ADD COLUMN "revoked_at" timestamp;--> statement-breakpoint
/* Orphaned rows would fail the constraint below, and a key owned by nobody
   should not survive anyway. */
DELETE FROM "admin_api_keys" WHERE "admin_id" NOT IN (SELECT "id" FROM "users");--> statement-breakpoint
ALTER TABLE "admin_api_keys" ADD CONSTRAINT "admin_api_keys_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
