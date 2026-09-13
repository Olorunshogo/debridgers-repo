ALTER TABLE "users" ADD COLUMN "sms_notifications" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "currency" varchar(8) DEFAULT 'NGN' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" varchar(2) DEFAULT 'NG' NOT NULL;