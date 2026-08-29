import { relations } from "drizzle-orm/relations";
import {
  users,
  buyerWallets,
  cartItems,
  product,
  commissions,
  orders,
  campaigns,
  agentProfiles,
  favorites,
  inventoryRecords,
  payouts,
  productCategories,
  orderItems,
  notifications,
  zones,
  riders,
  refunds,
  stockRequests,
  salesReports,
  walletTransactions,
  wallets,
  disputes,
  withdrawals,
  payments,
  emailVerification,
  passwordResets,
  adminAuditLog,
  adminApiKeys,
  adminAccounts,
  adminTransactions,
  buyerAdminLogs,
  paymentRecords,
  adminInvites,
} from "./schema";

export const buyerWalletsRelations = relations(
  buyerWallets,
  ({ one, many }) => ({
    user: one(users, {
      fields: [buyerWallets.userId],
      references: [users.id],
    }),
    walletTransactions: many(walletTransactions),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  buyerWallets: many(buyerWallets),
  cartItems: many(cartItems),
  commissions: many(commissions),
  campaigns: many(campaigns),
  agentProfiles_userId: many(agentProfiles, {
    relationName: "agentProfiles_userId_users_id",
  }),
  agentProfiles_referredByAgentId: many(agentProfiles, {
    relationName: "agentProfiles_referredByAgentId_users_id",
  }),
  favorites: many(favorites),
  inventoryRecords: many(inventoryRecords),
  payouts: many(payouts),
  notifications: many(notifications),
  orders_buyerId: many(orders, {
    relationName: "orders_buyerId_users_id",
  }),
  orders_agentId: many(orders, {
    relationName: "orders_agentId_users_id",
  }),
  orders_deliveryVerifiedByAdminId: many(orders, {
    relationName: "orders_deliveryVerifiedByAdminId_users_id",
  }),
  refunds: many(refunds),
  stockRequests: many(stockRequests),
  salesReports: many(salesReports),
  wallets: many(wallets),
  disputes: many(disputes),
  withdrawals_agentId: many(withdrawals, {
    relationName: "withdrawals_agentId_users_id",
  }),
  withdrawals_processedBy: many(withdrawals, {
    relationName: "withdrawals_processedBy_users_id",
  }),
  emailVerifications: many(emailVerification),
  passwordResets: many(passwordResets),
  adminAuditLogs: many(adminAuditLog),
  adminApiKeys: many(adminApiKeys),
  buyerAdminLogs_adminId: many(buyerAdminLogs, {
    relationName: "buyerAdminLogs_adminId_users_id",
  }),
  buyerAdminLogs_buyerId: many(buyerAdminLogs, {
    relationName: "buyerAdminLogs_buyerId_users_id",
  }),
  paymentRecords: many(paymentRecords),
  adminInvites_invitedByAdminId: many(adminInvites, {
    relationName: "adminInvites_invitedByAdminId_users_id",
  }),
  adminInvites_usedByAdminId: many(adminInvites, {
    relationName: "adminInvites_usedByAdminId_users_id",
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(product, {
    fields: [cartItems.productId],
    references: [product.id],
  }),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  cartItems: many(cartItems),
  favorites: many(favorites),
  orderItems: many(orderItems),
  stockRequests: many(stockRequests),
  productCategory: one(productCategories, {
    fields: [product.categoryId],
    references: [productCategories.id],
  }),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
  user: one(users, {
    fields: [commissions.agentId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [commissions.orderId],
    references: [orders.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  commissions: many(commissions),
  orderItems: many(orderItems),
  user_buyerId: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
    relationName: "orders_buyerId_users_id",
  }),
  user_agentId: one(users, {
    fields: [orders.agentId],
    references: [users.id],
    relationName: "orders_agentId_users_id",
  }),
  zone: one(zones, {
    fields: [orders.zoneId],
    references: [zones.id],
  }),
  rider: one(riders, {
    fields: [orders.riderId],
    references: [riders.id],
  }),
  user_deliveryVerifiedByAdminId: one(users, {
    fields: [orders.deliveryVerifiedByAdminId],
    references: [users.id],
    relationName: "orders_deliveryVerifiedByAdminId_users_id",
  }),
  refunds: many(refunds),
  disputes: many(disputes),
  payments: many(payments),
  paymentRecords: many(paymentRecords),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  user: one(users, {
    fields: [campaigns.sentBy],
    references: [users.id],
  }),
}));

export const agentProfilesRelations = relations(agentProfiles, ({ one }) => ({
  user_userId: one(users, {
    fields: [agentProfiles.userId],
    references: [users.id],
    relationName: "agentProfiles_userId_users_id",
  }),
  user_referredByAgentId: one(users, {
    fields: [agentProfiles.referredByAgentId],
    references: [users.id],
    relationName: "agentProfiles_referredByAgentId_users_id",
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  product: one(product, {
    fields: [favorites.productId],
    references: [product.id],
  }),
}));

export const inventoryRecordsRelations = relations(
  inventoryRecords,
  ({ one }) => ({
    user: one(users, {
      fields: [inventoryRecords.recordedBy],
      references: [users.id],
    }),
  }),
);

export const payoutsRelations = relations(payouts, ({ one }) => ({
  user: one(users, {
    fields: [payouts.agentId],
    references: [users.id],
  }),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one, many }) => ({
    productCategory: one(productCategories, {
      fields: [productCategories.parentId],
      references: [productCategories.id],
      relationName: "productCategories_parentId_productCategories_id",
    }),
    productCategories: many(productCategories, {
      relationName: "productCategories_parentId_productCategories_id",
    }),
    products: many(product),
  }),
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(product, {
    fields: [orderItems.productId],
    references: [product.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const zonesRelations = relations(zones, ({ many }) => ({
  orders: many(orders),
  riders: many(riders),
}));

export const ridersRelations = relations(riders, ({ one, many }) => ({
  orders: many(orders),
  zone: one(zones, {
    fields: [riders.zoneId],
    references: [zones.id],
  }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [refunds.initiatedBy],
    references: [users.id],
  }),
}));

export const stockRequestsRelations = relations(stockRequests, ({ one }) => ({
  user: one(users, {
    fields: [stockRequests.agentId],
    references: [users.id],
  }),
  product: one(product, {
    fields: [stockRequests.productId],
    references: [product.id],
  }),
}));

export const salesReportsRelations = relations(salesReports, ({ one }) => ({
  user: one(users, {
    fields: [salesReports.agentId],
    references: [users.id],
  }),
}));

export const walletTransactionsRelations = relations(
  walletTransactions,
  ({ one }) => ({
    buyerWallet: one(buyerWallets, {
      fields: [walletTransactions.walletId],
      references: [buyerWallets.id],
    }),
  }),
);

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  order: one(orders, {
    fields: [disputes.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [disputes.resolvedBy],
    references: [users.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user_agentId: one(users, {
    fields: [withdrawals.agentId],
    references: [users.id],
    relationName: "withdrawals_agentId_users_id",
  }),
  user_processedBy: one(users, {
    fields: [withdrawals.processedBy],
    references: [users.id],
    relationName: "withdrawals_processedBy_users_id",
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const emailVerificationRelations = relations(
  emailVerification,
  ({ one }) => ({
    user: one(users, {
      fields: [emailVerification.userId],
      references: [users.id],
    }),
  }),
);

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [adminAuditLog.adminId],
    references: [users.id],
  }),
}));

export const adminApiKeysRelations = relations(adminApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [adminApiKeys.adminId],
    references: [users.id],
  }),
}));

export const adminTransactionsRelations = relations(
  adminTransactions,
  ({ one }) => ({
    adminAccount: one(adminAccounts, {
      fields: [adminTransactions.adminAccountId],
      references: [adminAccounts.id],
    }),
  }),
);

export const adminAccountsRelations = relations(adminAccounts, ({ many }) => ({
  adminTransactions: many(adminTransactions),
}));

export const buyerAdminLogsRelations = relations(buyerAdminLogs, ({ one }) => ({
  user_adminId: one(users, {
    fields: [buyerAdminLogs.adminId],
    references: [users.id],
    relationName: "buyerAdminLogs_adminId_users_id",
  }),
  user_buyerId: one(users, {
    fields: [buyerAdminLogs.buyerId],
    references: [users.id],
    relationName: "buyerAdminLogs_buyerId_users_id",
  }),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({ one }) => ({
  order: one(orders, {
    fields: [paymentRecords.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [paymentRecords.buyerId],
    references: [users.id],
  }),
}));

export const adminInvitesRelations = relations(adminInvites, ({ one }) => ({
  user_invitedByAdminId: one(users, {
    fields: [adminInvites.invitedByAdminId],
    references: [users.id],
    relationName: "adminInvites_invitedByAdminId_users_id",
  }),
  user_usedByAdminId: one(users, {
    fields: [adminInvites.usedByAdminId],
    references: [users.id],
    relationName: "adminInvites_usedByAdminId_users_id",
  }),
}));
