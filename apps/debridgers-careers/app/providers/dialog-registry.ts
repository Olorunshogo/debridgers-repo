import type { DialogRegistry } from "@debridgers/ui-web";

export const DIALOG_REGISTRY: DialogRegistry = {
  CONFIRM: () => import("../components/dialogs/ConfirmDialog"),
};
