DROP INDEX "cart_items_user_product_idx";--> statement-breakpoint
DROP INDEX "favorites_user_product_idx";--> statement-breakpoint
DROP INDEX "order_items_order_idx";--> statement-breakpoint
DROP INDEX "order_items_product_idx";--> statement-breakpoint
DROP INDEX "notifications_user_read_idx";--> statement-breakpoint
DROP INDEX "wallet_transactions_created_at_index";--> statement-breakpoint
DROP INDEX "wallet_transactions_status_index";--> statement-breakpoint
DROP INDEX "wallet_transactions_wallet_id_index";--> statement-breakpoint
DROP INDEX "payments_order_id_index";--> statement-breakpoint
DROP INDEX "payments_our_reference_index";--> statement-breakpoint
DROP INDEX "payments_paystack_reference_index";--> statement-breakpoint
DROP INDEX "payments_status_index";--> statement-breakpoint
DROP INDEX "users_email_idx";--> statement-breakpoint
DROP INDEX "admin_audit_log_admin_id_index";--> statement-breakpoint
DROP INDEX "admin_audit_log_created_at_index";--> statement-breakpoint
DROP INDEX "admin_audit_log_resource_type_resource_id_index";--> statement-breakpoint
DROP INDEX "admin_accounts_account_type_index";--> statement-breakpoint
DROP INDEX "admin_accounts_created_at_index";--> statement-breakpoint
DROP INDEX "admin_transactions_admin_account_id_index";--> statement-breakpoint
DROP INDEX "admin_transactions_created_at_index";--> statement-breakpoint
DROP INDEX "admin_transactions_reference_index";--> statement-breakpoint
DROP INDEX "admin_transactions_status_index";--> statement-breakpoint
DROP INDEX "admin_transactions_type_index";--> statement-breakpoint
DROP INDEX "payment_records_buyer_id_index";--> statement-breakpoint
DROP INDEX "payment_records_created_at_index";--> statement-breakpoint
DROP INDEX "payment_records_order_id_index";--> statement-breakpoint
DROP INDEX "payment_records_paystack_reference_index";--> statement-breakpoint
DROP INDEX "payment_records_status_index";--> statement-breakpoint
ALTER TABLE "zones" ALTER COLUMN "areas" SET DEFAULT '{}';--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_product_idx" ON "cart_items" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_product_idx" ON "favorites" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "wallet_transactions_created_at_index" ON "wallet_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wallet_transactions_status_index" ON "wallet_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_id_index" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "payments_order_id_index" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_our_reference_index" ON "payments" USING btree ("our_reference");--> statement-breakpoint
CREATE INDEX "payments_paystack_reference_index" ON "payments" USING btree ("paystack_reference");--> statement-breakpoint
CREATE INDEX "payments_status_index" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "admin_audit_log_admin_id_index" ON "admin_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_index" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_resource_type_resource_id_index" ON "admin_audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "admin_accounts_account_type_index" ON "admin_accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "admin_accounts_created_at_index" ON "admin_accounts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_transactions_admin_account_id_index" ON "admin_transactions" USING btree ("admin_account_id");--> statement-breakpoint
CREATE INDEX "admin_transactions_created_at_index" ON "admin_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_transactions_reference_index" ON "admin_transactions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "admin_transactions_status_index" ON "admin_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_transactions_type_index" ON "admin_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "payment_records_buyer_id_index" ON "payment_records" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "payment_records_created_at_index" ON "payment_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_records_order_id_index" ON "payment_records" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_records_paystack_reference_index" ON "payment_records" USING btree ("paystack_reference");--> statement-breakpoint
CREATE INDEX "payment_records_status_index" ON "payment_records" USING btree ("status");