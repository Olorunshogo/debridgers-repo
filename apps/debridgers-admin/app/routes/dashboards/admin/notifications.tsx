import { NotificationsPage } from "@debridgers/ui-web";
import { useNotificationsService } from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Notifications | Debridgers Admin",
    description:
      "Agent applications, withdrawals and deliveries awaiting your attention.",
    path: "/notifications",
    noIndex: true,
  });
}

/* Page and data are both shared; the role is the only thing this file decides. */
export default function AdminNotifications() {
  const props = useNotificationsService({ role: "admin" });

  return <NotificationsPage {...props} />;
}
