import { NotificationsPage } from "@debridgers/ui-web";
import { useNotificationsService } from "@/hooks/useNotificationsService";

export function meta() {
  return [
    { title: "Notifications | Debridgers" },
    {
      name: "description",
      content:
        "View your order updates, delivery alerts and messages from Debridgers.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

/* Page and data are both shared; the role is the only thing this file decides. */
export default function BuyerNotifications() {
  const props = useNotificationsService({ role: "buyer" });

  return <NotificationsPage {...props} />;
}
