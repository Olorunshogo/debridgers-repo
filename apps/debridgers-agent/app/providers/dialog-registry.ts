import type { DialogRegistry } from "@debridgers/ui-web";

/*
 * The app's dialog registry: every key that triggerDialog can open, mapped to a
 * lazy import so a dialog's code is only downloaded when first opened.
 *
 * To add a dialog:
 *   1. Build the presentation component in packages/ui-web (pure props in, no
 *      data fetching or routing knowledge).
 *   2. Build a thin glue component in app/components/dialogs/ that wires
 *      useDialog() and useDialogSubmission() around it.
 *   3. Add the glue component here.
 *   4. Open it with `const { triggerDialog } = useDialog();
 *      triggerDialog('YOUR_KEY', { ...props })`.
 *
 * REQUEST_PAYOUT is the reference implementation - copy its shape. The other
 * hand-rolled modals in this app still own their own useState; migrate them one
 * at a time. See docs/frontend/Context.md rule 12.
 */
export const DIALOG_REGISTRY: DialogRegistry = {
  /* Opened by the table engine for any row action declaring `confirm`. */
  CONFIRM: () => import("../components/dialogs/ConfirmDialog"),
  REQUEST_PAYOUT: () => import("../components/dialogs/RequestPayoutDialog"),
  REMIT_STOCK: () => import("../components/dialogs/RemitStockDialog"),
  REJECT_PAYOUT: () => import("../components/dialogs/RejectPayoutDialog"),
  PAYMENT_METHOD: () => import("../components/dialogs/PaymentMethodDialog"),
  HELP_GUIDE: () => import("../components/dialogs/HelpGuideDialog"),
  SUPPORT_TICKET: () => import("../components/dialogs/SupportTicketDialog"),
  CHANGE_PASSWORD: () => import("../components/dialogs/ChangePasswordDialog"),
  VERIFY_INVITE: () => import("../components/dialogs/InviteVerificationDialog"),
};
