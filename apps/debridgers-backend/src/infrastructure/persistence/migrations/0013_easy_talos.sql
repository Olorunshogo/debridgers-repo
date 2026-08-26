CREATE TABLE "admin_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"invite_code" varchar(32) NOT NULL,
	"email" varchar(255) NOT NULL,
	"invited_by_admin_id" integer NOT NULL,
	"used_at" timestamp,
	"used_by_admin_id" integer,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_invites_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_tier" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_api_key" varchar(255);--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_invited_by_admin_id_users_id_fk" FOREIGN KEY ("invited_by_admin_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_used_by_admin_id_users_id_fk" FOREIGN KEY ("used_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_api_key_unique" UNIQUE("admin_api_key");