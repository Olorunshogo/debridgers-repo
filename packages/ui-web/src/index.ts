// === Utils
export * from "./lib/utils";

// === Href helpers
export * from "./lib/is-external-href";

// === Email validation
export * from "./lib/is-valid-email";

// === Formatting helpers
export * from "./utils";

// === Shared types
export * from "./types";

// === Reference data
export * from "./data";
export * from "./data/help-content";

// === Validation schemas
export * from "./schemas";

// === Motion variants
export * from "./lib/motion";

// === Dialog engine
export * from "./lib/dialog";

// === Table engine
export * from "./lib/table";
export * from "./lib/seo/build-page-meta";

// === Auth hooks
export * from "./hooks";

// === Agent dialogs
export * from "./components/agent/agent-request-payout-dialog";

// === Buyer dialogs
export * from "./components/buyer/buyer-payment-method-dialog";
export * from "./components/help/help-guide-dialog";
export * from "./components/help/support-ticket-dialog";
export * from "./components/help/help-center";

// === Shared auth forms
export * from "./components/auth/auth-field";
export * from "./components/auth/auth-otp-input";
export * from "./components/auth/auth-form-shell";
export * from "./components/auth/auth-credentials-form";
export * from "./components/auth/auth-signup-form";
export * from "./components/auth/auth-tab-panel";

// === Links
export * from "./components/primary-link";
export * from "./components/secondary-link";
export * from "./components/yellow-primary-link";

// === Base
export * from "./components/base-input-field";

/*
 * Every input in the app, dashboard and marketing alike. The marketing pages
 * had their own controlled copies of three of these; they now pass
 * variant="pill" instead, so a fix to a label or an error state lands once.
 */
// === Inputs
export * from "./components/text-input-field";
export * from "./components/email-input-field";
export * from "./components/password-input-field";
export * from "./components/number-input-field";
export * from "./components/date-input-field";
export * from "./components/select-input-field";
export * from "./components/select-button-field";
export * from "./components/toggle-field";
export * from "./components/search-input-field";
export * from "./components/textarea-field";
export * from "./components/select-field";
export * from "./components/submit-button";

// === Feedback
export * from "./components/alert-banner";
export * from "./components/action-required-chip";
export * from "./components/coming-soon";

// === Notifications
export * from "./components/notifications";

// === Product sorting
export * from "./components/sort-menu";

// === Confirmation
export * from "./components/confirm-dialog-panel";

// === Uploads
/*
 * One component for both. A photo is a file, but the payloads differ: a file
 * upload hands back the File, a photo upload hands back downscaled base64. The
 * `kind` prop is a discriminated union so each keeps its exact callback type.
 */
export * from "./components/upload-field";

// === Dashboard shell
export * from "./components/hero-greeting-card";

// === Legal documents
export * from "./components/legal/legal-document-view";
export * from "./components/legal/legal-section";
export * from "./components/legal/legal-block";
export * from "./components/legal/legal-inline";
export * from "./components/legal/legal-toc";

// === Other components
export * from "./components/app-logo";
export * from "./components/button";
export * from "./components/whatsapp-link";
export * from "./components/button-primary";
export * from "./components/button-secondary";
export * from "./components/product-card";
export * from "./components/pagination";
