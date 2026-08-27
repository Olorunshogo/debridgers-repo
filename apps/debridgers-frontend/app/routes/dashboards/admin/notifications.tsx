import { NotificationsPage } from "@debridgers/ui-web";
import { useNotificationsService } from "@/hooks/useNotificationsService";

export function meta() {
  return [
    { title: "Notifications | Debridgers Admin" },
    {
      name: "description",
      content:
        "Agent applications, withdrawals and deliveries awaiting your attention.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

/* Page and data are both shared; the role is the only thing this file decides. */
export default function AdminNotifications() {
  const props = useNotificationsService({ role: "admin" });

  return <NotificationsPage {...props} />;
}
