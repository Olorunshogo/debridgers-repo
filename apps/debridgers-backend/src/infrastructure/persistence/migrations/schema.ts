import {
  pgTable,
  foreignKey,
  unique,
  serial,
  integer,
  bigint,
  timestamp,
  varchar,
  uniqueIndex,
  numeric,
  date,
  text,
  boolean,
  index,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const adminAccountType = pgEnum("admin_account_type", [
  "platform",
  "merchant",
  "holding",
]);
export const adminTransactionStatus = pgEnum("admin_transaction_status", [
  "completed",
  "pending",
  "failed",
  "reversed",
]);
export const adminTransactionType = pgEnum("admin_transaction_type", [
  "order_payment",
  "vendor_payout",
  "refund",
  "manual_adjustment",
  "platform_fee",
]);
export const agentIdType = pgEnum("agent_id_type", [
  "NIN",
  "Passport",
  "Drivers License",
]);
export const agentStatus = pgEnum("agent_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);
export const campaignStatus = pgEnum("campaign_status", ["draft", "sent"]);
export const campaignTarget = pgEnum("campaign_target", [
  "buyers",
  "agents",
  "all",
]);
export const commissionStatus = pgEnum("commission_status", [
  "pending",
  "confirmed",
  "paid",
]);
export const commissionType = pgEnum("commission_type", [
  "direct",
  "buyer_referral",
  "agent_override",
  "state_manager_override",
]);
export const disputeStatus = pgEnum("dispute_status", [
  "initiated",
  "under_review",
  "resolved",
  "won",
  "lost",
]);
export const disputeType = pgEnum("dispute_type", [
  "chargeback",
  "customer_complaint",
  "refund_dispute",
]);
export const kycStatus = pgEnum("kyc_status", [
  "not_submitted",
  "submitted",
  "approved",
  "rejected",
]);
export const orderMode = pgEnum("order_mode", ["field", "referral"]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);
export const paymentMethod = pgEnum("payment_method", [
  "wallet",
  "card",
  "transfer",
  "ussd",
]);
export const paymentRecordStatus = pgEnum("payment_record_status", [
  "initiated",
  "pending",
  "completed",
  "failed",
  "reversed",
]);
export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "awaiting",
  "paid",
  "failed",
]);
export const paymentTransactionStatus = pgEnum("payment_transaction_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
]);
export const payoutStatus = pgEnum("payout_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const refundStatus = pgEnum("refund_status", [
  "initiated",
  "processing",
  "completed",
  "failed",
]);
export const stockRequestStatus = pgEnum("stock_request_status", [
  "pending",
  "fulfilled",
  "cancelled",
]);
export const userRole = pgEnum("user_role", [
  "admin",
  "agent",
  "buyer",
  "company",
]);
export const walletTransactionStatus = pgEnum("wallet_transaction_status", [
  "pending",
  "completed",
  "failed",
]);
export const walletTransactionType = pgEnum("wallet_transaction_type", [
  "deposit",
  "withdraw",
  "refund",
]);
export const withdrawalStatus = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "rejected",
  "paid",
]);

export const buyerWallets = pgTable(
  "buyer_wallets",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    availableBalance: bigint("available_balance", { mode: "number" })
      .default(0)
      .notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    pendingBalance: bigint("pending_balance", { mode: "number" })
      .default(0)
      .notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalDeposited: bigint("total_deposited", { mode: "number" })
      .default(0)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    paystackCustomerCode: varchar("paystack_customer_code", { length: 100 }),
    accountNumber: varchar("account_number", { length: 20 }),
    bankName: varchar("bank_name", { length: 100 }),
    accountName: varchar("account_name", { length: 100 }),
    payoutBankCode: varchar("payout_bank_code", { length: 10 }),
    payoutBankName: varchar("payout_bank_name", { length: 100 }),
    payoutAccountNumber: varchar("payout_account_number", { length: 20 }),
    payoutAccountName: varchar("payout_account_name", { length: 100 }),
    paystackRecipientCode: varchar("paystack_recipient_code", { length: 100 }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "buyer_wallets_user_id_users_id_fk",
    }).onDelete("cascade"),
    unique("buyer_wallets_user_id_unique").on(table.userId),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    productId: integer("product_id").notNull(),
    quantity: integer().default(1).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    uniqueIndex("cart_items_user_product_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
      table.productId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "cart_items_user_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [product.id],
      name: "cart_items_product_id_product_id_fk",
    }).onDelete("cascade"),
  ],
);

export const commissions = pgTable(
  "commissions",
  {
    id: serial().primaryKey().notNull(),
    agentId: integer("agent_id").notNull(),
    orderId: integer("order_id"),
    type: commissionType().notNull(),
    amount: numeric({ precision: 12, scale: 2 }),
    status: commissionStatus().default("pending").notNull(),
    paidAt: timestamp("paid_at", { mode: "string" }),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    amountKobo: integer("amount_kobo").default(0).notNull(),
    period: date(),
  },
  (table) => [
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [users.id],
      name: "commissions_agent_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "commissions_order_id_orders_id_fk",
    }).onDelete("cascade"),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: serial().primaryKey().notNull(),
    title: text().notNull(),
    subject: text().notNull(),
    body: text().notNull(),
    targetList: campaignTarget("target_list").notNull(),
    mailtrapCampaignId: text("mailtrap_campaign_id"),
    status: campaignStatus().default("draft").notNull(),
    sentAt: timestamp("sent_at", { mode: "string" }),
    sentBy: integer("sent_by"),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.sentBy],
      foreignColumns: [users.id],
      name: "campaigns_sent_by_users_id_fk",
    }).onDelete("set null"),
  ],
);

export const agentProfiles = pgTable(
  "agent_profiles",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    address: text(),
    state: text(),
    lga: text(),
    status: agentStatus().default("pending").notNull(),
    adminNotes: text("admin_notes"),
    referredByAgentId: integer("referred_by_agent_id"),
    referralBuyerCode: varchar("referral_buyer_code", { length: 20 }),
    referralAgentCode: varchar("referral_agent_code", { length: 20 }),
    isStateManager: boolean("is_state_manager").default(false).notNull(),
    managedState: text("managed_state"),
    bankName: text("bank_name"),
    bankCode: varchar("bank_code", { length: 10 }),
    bankAccountNumber: varchar("bank_account_number", { length: 20 }),
    bankAccountName: text("bank_account_name"),
    kycStatus: kycStatus("kyc_status").default("not_submitted").notNull(),
    kycRejectionReason: text("kyc_rejection_reason"),
    idType: agentIdType("id_type"),
    idFrontUrl: text("id_front_url"),
    idSelfieUrl: text("id_selfie_url"),
    nin: varchar({ length: 20 }),
    cvUrl: text("cv_url"),
    target: integer().default(0).notNull(),
    paystackSubaccountCode: varchar("paystack_subaccount_code", {
      length: 100,
    }),
    mailtrapContactId: text("mailtrap_contact_id"),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    paystackRecipientCode: varchar("paystack_recipient_code", { length: 100 }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "agent_profiles_user_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.referredByAgentId],
      foreignColumns: [users.id],
      name: "agent_profiles_referred_by_agent_id_users_id_fk",
    }).onDelete("set null"),
    unique("uq_agent_user_id").on(table.userId),
    unique("uq_referral_buyer_code").on(table.referralBuyerCode),
    unique("uq_referral_agent_code").on(table.referralAgentCode),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    productId: integer("product_id").notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    uniqueIndex("favorites_user_product_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
      table.productId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "favorites_user_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [product.id],
      name: "favorites_product_id_product_id_fk",
    }).onDelete("cascade"),
  ],
);

export const inventoryRecords = pgTable(
  "inventory_records",
  {
    id: serial().primaryKey().notNull(),
    quantity: integer().notNull(),
    source: text().default("Agrolinking").notNull(),
    notes: text(),
    recordedBy: integer("recorded_by"),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [users.id],
      name: "inventory_records_recorded_by_users_id_fk",
    }).onDelete("set null"),
  ],
);

export const leads = pgTable("leads", {
  id: serial().primaryKey().notNull(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  message: text().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export const outreachRecords = pgTable("outreach_records", {
  id: serial().primaryKey().notNull(),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name"),
  phone: text(),
  lga: text(),
  area: text(),
  address: text(),
  productInterest: text("product_interest"),
  quantity: integer(),
  notes: text(),
  collectedBy: text("collected_by"),
  visitDate: text("visit_date").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export const payouts = pgTable(
  "payouts",
  {
    id: serial().primaryKey().notNull(),
    agentId: integer("agent_id").notNull(),
    subaccountCode: varchar("subaccount_code", { length: 50 }),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    reference: varchar({ length: 100 }).notNull(),
    status: payoutStatus().default("pending").notNull(),
    initiatedAt: timestamp("initiated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { mode: "string" }),
    errorMessage: text("error_message"),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [users.id],
      name: "payouts_agent_id_users_id_fk",
    }).onDelete("cascade"),
    unique("payouts_reference_unique").on(table.reference),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    id: serial().primaryKey().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    parentId: integer("parent_id"),
    description: text(),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "product_categories_parent_id_product_categories_id_fk",
    }).onDelete("cascade"),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial().primaryKey().notNull(),
    orderId: integer("order_id").notNull(),
    productId: integer("product_id").notNull(),
    quantity: integer().notNull(),
    unitPriceKobo: integer("unit_price_kobo").notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    index("order_items_order_idx").using(
      "btree",
      table.orderId.asc().nullsLast().op("int4_ops"),
    ),
    index("order_items_product_idx").using(
      "btree",
      table.productId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "order_items_order_id_orders_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [product.id],
      name: "order_items_product_id_product_id_fk",
    }).onDelete("restrict"),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    title: text().notNull(),
    description: text().notNull(),
    read: boolean().default(false).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    type: text().default("general").notNull(),
    done: boolean().default(false).notNull(),
  },
  (table) => [
    index("notifications_user_read_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops"),
      table.read.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "notifications_user_id_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: serial().primaryKey().notNull(),
    buyerId: integer("buyer_id").notNull(),
    agentId: integer("agent_id"),
    zoneId: integer("zone_id").notNull(),
    riderId: integer("rider_id"),
    quantity: integer().notNull(),
    unitPrice: integer("unit_price").default(140000).notNull(),
    handlingFee: integer("handling_fee").default(10000).notNull(),
    deliveryFee: integer("delivery_fee").notNull(),
    totalAmount: integer("total_amount").notNull(),
    orderMode: orderMode("order_mode").notNull(),
    status: orderStatus().default("pending").notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    cancellationReason: text("cancellation_reason"),
    notes: text(),
    deliveredAt: timestamp("delivered_at", { mode: "string" }),
    paymentStatus: paymentStatus("payment_status").default("unpaid").notNull(),
    paymentReference: varchar("payment_reference", { length: 100 }),
    virtualAccountNumber: varchar("virtual_account_number", { length: 20 }),
    virtualAccountBank: text("virtual_account_bank"),
    virtualAccountAccountName: text("virtual_account_account_name"),
    virtualAccountExpiresAt: timestamp("virtual_account_expires_at", {
      mode: "string",
    }),
    paidAt: timestamp("paid_at", { mode: "string" }),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    orderReference: varchar("order_reference", { length: 30 }).notNull(),
    paystackInvoiceCode: varchar("paystack_invoice_code", { length: 100 }),
    deliveryVerifiedAt: timestamp("delivery_verified_at", { mode: "string" }),
    deliveryVerifiedByAdminId: integer("delivery_verified_by_admin_id"),
    deliveryProofPhotos: jsonb("delivery_proof_photos"),
    deliveryNotes: text("delivery_notes"),
  },
  (table) => [
    foreignKey({
      columns: [table.buyerId],
      foreignColumns: [users.id],
      name: "orders_buyer_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [users.id],
      name: "orders_agent_id_users_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.zoneId],
      foreignColumns: [zones.id],
      name: "orders_zone_id_zones_id_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.riderId],
      foreignColumns: [riders.id],
      name: "orders_rider_id_riders_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.deliveryVerifiedByAdminId],
      foreignColumns: [users.id],
      name: "orders_delivery_verified_by_admin_id_users_id_fk",
    }).onDelete("set null"),
    unique("orders_order_reference_unique").on(table.orderReference),
  ],
);

export const riders = pgTable(
  "riders",
  {
    id: serial().primaryKey().notNull(),
    fullName: text("full_name").notNull(),
    phone: varchar({ length: 20 }).notNull(),
    zoneId: integer("zone_id"),
    isAvailable: boolean("is_available").default(true).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.zoneId],
      foreignColumns: [zones.id],
      name: "riders_zone_id_zones_id_fk",
    }).onDelete("set null"),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    id: serial().primaryKey().notNull(),
    orderId: integer("order_id").notNull(),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    reference: varchar({ length: 100 }).notNull(),
    reason: varchar({ length: 255 }),
    status: refundStatus().default("initiated").notNull(),
    initiatedBy: integer("initiated_by"),
    initiatedAt: timestamp("initiated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { mode: "string" }),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "refunds_order_id_orders_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.initiatedBy],
      foreignColumns: [users.id],
      name: "refunds_initiated_by_users_id_fk",
    }).onDelete("set null"),
    unique("refunds_reference_unique").on(table.reference),
  ],
);

export const stockRequests = pgTable(
  "stock_requests",
  {
    id: serial().primaryKey().notNull(),
    agentId: integer("agent_id").notNull(),
    productId: integer("product_id"),
    quantity: integer().notNull(),
    status: stockRequestStatus().default("pending").notNull(),
    amountToRemit: integer("amount_to_remit").notNull(),
    amountRemitted: integer("amount_remitted").default(0).notNull(),
    fulfilledAt: timestamp("fulfilled_at", { mode: "string" }),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [users.id],
      name: "stock_requests_agent_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [product.id],
      name: "stock_requests_product_id_product_id_fk",
    }).onDelete("set null"),
  ],
);

export const simpleProducts = pgTable("simple_products", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  unit: text().notNull(),
  priceKobo: integer("price_kobo").notNull(),
  description: text(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export const product = pgTable(
  "product",
  {
    id: serial().primaryKey().notNull(),
    name: text().notNull(),
    unit: text().notNull(),
    priceKobo: integer("price_kobo").notNull(),
    measureValue: integer("measure_value"),
    measureUnit: text("measure_unit"),
    weightGrams: integer("weight_grams"),
    category: text().default("Uncategorized").notNull(),
    categoryId: integer("category_id"),
    description: text(),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [productCategories.id],
      name: "product_category_id_product_categories_id_fk",
    }).onDelete("restrict"),
  ],
);

export const salesReports = pgTable(
  "sales_reports",
  {
    id: serial().primaryKey().notNull(),
    agentId: integer("agent_id").notNull(),
    pagesSold: integer("pages_sold").default(0).notNull(),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    notes: text(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [users.id],
      name: "sales_reports_agent_id_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const systemSettings = pgTable(
  "system_settings",
  {
    id: serial().primaryKey().notNull(),
    key: text().notNull(),
    value: text().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [unique("system_settings_key_unique").on(table.key)],
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: serial().primaryKey().notNull(),
    walletId: integer("wallet_id").notNull(),
    type: walletTransactionType().notNull(),
    amount: integer().notNull(),
    status: walletTransactionStatus().notNull(),
    reference: varchar({ length: 255 }),
    description: text(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index().using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index().using("btree", table.status.asc().nullsLast().op("enum_ops")),
    index().using("btree", table.walletId.asc().nullsLast().op("int4_ops")),
    foreignKey({
      columns: [table.walletId],
      foreignColumns: [buyerWallets.id],
      name: "wallet_transactions_wallet_id_buyer_wallets_id_fk",
    }).onDelete("cascade"),
    unique("wallet_transactions_reference_unique").on(table.reference),
  ],
);

export const wallets = pgTable(
  "wallets",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    availableBalance: bigint("available_balance", { mode: "number" })
      .default(0)
      .notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    pendingBalance: bigint("pending_balance", { mode: "number" })
      .default(0)
      .notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalEarned: bigint("total_earned", { mode: "number" })
      .default(0)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "wallets_user_id_users_id_fk",
    }).onDelete("cascade"),
    unique("uq_wallet_user_id").on(table.userId),
  ],
);

export const disputes = pgTable(
  "disputes",
  {
    id: serial().primaryKey().notNull(),
    orderId: integer("order_id").notNull(),
    type: disputeType().notNull(),
    status: disputeStatus().default("initiated").notNull(),
    reason: text(),
    paystackReference: varchar("paystack_reference", { length: 100 }),
    initiatedAt: timestamp("initiated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { mode: "string" }),
    resolutionNotes: text("resolution_notes"),
    resolvedBy: integer("resolved_by"),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "disputes_order_id_orders_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.resolvedBy],
      foreignColumns: [users.id],
      name: "disputes_resolved_by_users_id_fk",
    }).onDelete("set null"),
  ],
);

export const zones = pgTable("zones", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  description: text(),
  deliveryFee: integer("delivery_fee").notNull(),
  areas: text().array().default([""]).notNull(),
  freeDelivery: boolean("free_delivery").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: serial().primaryKey().notNull(),
    agentId: integer("agent_id").notNull(),
    amount: integer().notNull(),
    bankName: text("bank_name").notNull(),
    bankCode: varchar("bank_code", { length: 10 }).notNull(),
    bankAccountNumber: text("bank_account_number").notNull(),
    bankAccountName: text("bank_account_name").notNull(),
    payoutReference: varchar("payout_reference", { length: 100 }),
    status: withdrawalStatus().default("pending").notNull(),
    rejectionReason: text("rejection_reason"),
    processedAt: timestamp("processed_at", { mode: "string" }),
    processedBy: integer("processed_by"),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.agentId],
      foreignColumns: [users.id],
      name: "withdrawals_agent_id_users_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.processedBy],
      foreignColumns: [users.id],
      name: "withdrawals_processed_by_users_id_fk",
    }).onDelete("set null"),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: serial().primaryKey().notNull(),
    orderId: integer("order_id").notNull(),
    ourReference: varchar("our_reference", { length: 100 }),
    paystackReference: varchar("paystack_reference", { length: 100 }),
    amountKobo: integer("amount_kobo").notNull(),
    status: paymentTransactionStatus().default("pending").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }).default(
      "paystack",
    ),
    paidAt: timestamp("paid_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index().using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
    index().using("btree", table.ourReference.asc().nullsLast().op("text_ops")),
    index().using(
      "btree",
      table.paystackReference.asc().nullsLast().op("text_ops"),
    ),
    index().using("btree", table.status.asc().nullsLast().op("enum_ops")),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "payments_order_id_orders_id_fk",
    }).onDelete("cascade"),
  ],
);

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text().notNull(),
    phone: varchar({ length: 20 }),
    password: varchar({ length: 256 }),
    role: userRole().default("buyer").notNull(),
    isEmailVerified: boolean("is_email_verified").default(false).notNull(),
    isPhoneVerified: boolean("is_phone_verified").default(false).notNull(),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    isSuspended: boolean("is_suspended").default(false).notNull(),
    zoneId: integer("zone_id"),
    deliveryAddress: text("delivery_address"),
    referredByAgentId: integer("referred_by_agent_id"),
    avatarUrl: text("avatar_url"),
    mailtrapContactId: text("mailtrap_contact_id"),
    refreshToken: text("refresh_token"),
    emailNotifications: boolean("email_notifications").default(true).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    suspendedAt: timestamp("suspended_at", { mode: "string" }),
    suspendedReason: text("suspended_reason"),
    totalDeposited: integer("total_deposited").default(0).notNull(),
    adminTier: varchar("admin_tier", { length: 20 }),
    adminApiKey: varchar("admin_api_key", { length: 255 }),
    mustChangePassword: boolean("must_change_password")
      .default(false)
      .notNull(),
    passwordChangedAt: timestamp("password_changed_at", { mode: "string" }),
  },
  (table) => [
    uniqueIndex("users_email_idx").using("btree", sql`lower(email)`),
    unique("users_admin_api_key_unique").on(table.adminApiKey),
  ],
);

export const emailVerification = pgTable(
  "email_verification",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    token: text().notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    attempts: integer().default(0).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "email_verification_user_id_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    token: text().notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "password_resets_user_id_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: serial().primaryKey().notNull(),
    adminId: integer("admin_id"),
    action: text().notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: integer("resource_id"),
    details: jsonb(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index().using("btree", table.adminId.asc().nullsLast().op("int4_ops")),
    index().using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index().using(
      "btree",
      table.resourceType.asc().nullsLast().op("text_ops"),
      table.resourceId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.adminId],
      foreignColumns: [users.id],
      name: "admin_audit_log_admin_id_users_id_fk",
    }).onDelete("set null"),
  ],
);

export const adminApiKeys = pgTable(
  "admin_api_keys",
  {
    id: serial().primaryKey().notNull(),
    adminId: integer("admin_id").notNull(),
    keyHash: text("key_hash").notNull(),
    name: varchar({ length: 255 }).notNull(),
    lastUsedAt: timestamp("last_used_at", { mode: "string" }),
    isActive: boolean("is_active").default(true).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    revokedAt: timestamp("revoked_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.adminId],
      foreignColumns: [users.id],
      name: "admin_api_keys_admin_id_users_id_fk",
    }).onDelete("cascade"),
  ],
);

export const adminAccounts = pgTable(
  "admin_accounts",
  {
    id: serial().primaryKey().notNull(),
    accountType: adminAccountType("account_type").default("platform").notNull(),
    name: varchar({ length: 100 }).notNull(),
    balance: integer().default(0).notNull(),
    totalReceived: integer("total_received").default(0).notNull(),
    totalPaidOut: integer("total_paid_out").default(0).notNull(),
    description: text(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index().using("btree", table.accountType.asc().nullsLast().op("enum_ops")),
    index().using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
  ],
);

export const adminTransactions = pgTable(
  "admin_transactions",
  {
    id: serial().primaryKey().notNull(),
    adminAccountId: integer("admin_account_id").notNull(),
    type: adminTransactionType().notNull(),
    amount: integer().notNull(),
    status: adminTransactionStatus().default("completed").notNull(),
    reference: varchar({ length: 100 }),
    description: text(),
    relatedUserId: integer("related_user_id"),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index().using(
      "btree",
      table.adminAccountId.asc().nullsLast().op("int4_ops"),
    ),
    index().using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index().using("btree", table.reference.asc().nullsLast().op("text_ops")),
    index().using("btree", table.status.asc().nullsLast().op("enum_ops")),
    index().using("btree", table.type.asc().nullsLast().op("enum_ops")),
    foreignKey({
      columns: [table.adminAccountId],
      foreignColumns: [adminAccounts.id],
      name: "admin_transactions_admin_account_id_admin_accounts_id_fk",
    }).onDelete("restrict"),
  ],
);

export const buyerAdminLogs = pgTable(
  "buyer_admin_logs",
  {
    id: serial().primaryKey().notNull(),
    adminId: integer("admin_id").notNull(),
    buyerId: integer("buyer_id").notNull(),
    action: varchar({ length: 50 }).notNull(),
    details: jsonb(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.adminId],
      foreignColumns: [users.id],
      name: "buyer_admin_logs_admin_id_users_id_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.buyerId],
      foreignColumns: [users.id],
      name: "buyer_admin_logs_buyer_id_users_id_fk",
    }).onDelete("restrict"),
  ],
);

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: serial().primaryKey().notNull(),
    orderId: integer("order_id").notNull(),
    buyerId: integer("buyer_id").notNull(),
    amountKobo: integer("amount_kobo").notNull(),
    paymentMethod: paymentMethod("payment_method").notNull(),
    status: paymentRecordStatus().default("initiated").notNull(),
    paystackReference: varchar("paystack_reference", { length: 100 }),
    paystackTransferCode: varchar("paystack_transfer_code", { length: 100 }),
    paystackReceiptNumber: varchar("paystack_receipt_number", { length: 100 }),
    description: text(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { mode: "string" }),
  },
  (table) => [
    index().using("btree", table.buyerId.asc().nullsLast().op("int4_ops")),
    index().using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops"),
    ),
    index().using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
    index().using(
      "btree",
      table.paystackReference.asc().nullsLast().op("text_ops"),
    ),
    index().using("btree", table.status.asc().nullsLast().op("enum_ops")),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "payment_records_order_id_orders_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.buyerId],
      foreignColumns: [users.id],
      name: "payment_records_buyer_id_users_id_fk",
    }).onDelete("cascade"),
    unique("payment_records_paystack_reference_unique").on(
      table.paystackReference,
    ),
  ],
);

export const adminInvites = pgTable(
  "admin_invites",
  {
    id: serial().primaryKey().notNull(),
    inviteCode: varchar("invite_code", { length: 32 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    invitedByAdminId: integer("invited_by_admin_id").notNull(),
    usedAt: timestamp("used_at", { mode: "string" }),
    usedByAdminId: integer("used_by_admin_id"),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.invitedByAdminId],
      foreignColumns: [users.id],
      name: "admin_invites_invited_by_admin_id_users_id_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.usedByAdminId],
      foreignColumns: [users.id],
      name: "admin_invites_used_by_admin_id_users_id_fk",
    }).onDelete("set null"),
    unique("admin_invites_invite_code_unique").on(table.inviteCode),
  ],
);
