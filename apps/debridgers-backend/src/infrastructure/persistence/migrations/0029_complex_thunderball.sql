CREATE TABLE "ratings_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"context_key" text NOT NULL,
	"rater_role" text NOT NULL,
	"rater_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"agent_id" integer,
	"target_type" text NOT NULL,
	"target_id" integer,
	"score" integer NOT NULL,
	"facets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comment" text,
	"facet_catalogue_version" integer NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"formula_version" integer DEFAULT 1 NOT NULL,
	"visibility_scope" text DEFAULT 'self' NOT NULL,
	"consent_version" integer DEFAULT 1 NOT NULL,
	"disputed" boolean DEFAULT false NOT NULL,
	"editable_until" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ratings_submissions" ADD CONSTRAINT "ratings_submissions_rater_id_users_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings_submissions" ADD CONSTRAINT "ratings_submissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings_submissions" ADD CONSTRAINT "ratings_submissions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings_submissions" ADD CONSTRAINT "ratings_submissions_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_submissions_order_context_rater_idx" ON "ratings_submissions" USING btree ("order_id","context_key","rater_id");--> statement-breakpoint
CREATE INDEX "ratings_submissions_target_idx" ON "ratings_submissions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "ratings_submissions_rater_idx" ON "ratings_submissions" USING btree ("rater_id");