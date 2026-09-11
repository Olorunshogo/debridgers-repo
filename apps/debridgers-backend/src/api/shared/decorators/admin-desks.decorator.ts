import { SetMetadata } from "@nestjs/common";

export type AdminDesk = "buyer" | "agent" | "hr";

export const ADMIN_DESKS_KEY = "admin_desks";

/** Restrict an admin route to these desks. Super admin always passes. */
export const AdminDesks = (...desks: AdminDesk[]) =>
  SetMetadata(ADMIN_DESKS_KEY, desks);
