import { NotificationsPage } from "@debridgers/ui-web";
import { useNotificationsService } from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Notifications | Debridgers",
    description:
      "View your order updates, delivery alerts and messages from Debridgers.",
    path: "/notifications",
    noIndex: true,
  });
}

/* Page and data are both shared; the role is the only thing this file decides. */
export default function BuyerNotifications() {
  const props = useNotificationsService({ role: "buyer" });

  return <NotificationsPage {...props} />;
}
