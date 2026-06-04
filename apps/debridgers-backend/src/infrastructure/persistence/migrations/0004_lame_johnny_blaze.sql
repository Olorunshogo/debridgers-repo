CREATE TABLE "outreach_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_name" text NOT NULL,
	"owner_name" text,
	"phone" varchar(20),
	"lga" text,
	"address" text,
	"product_interest" text,
	"quantity" integer,
	"notes" text,
	"collected_by" text,
	"visit_date" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
