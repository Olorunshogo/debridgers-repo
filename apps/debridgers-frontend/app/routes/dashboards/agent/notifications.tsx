import { NotificationsPage } from "@debridgers/ui-web";
import { useNotificationsService } from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Notifications | Debridgers" },
    {
      name: "description",
      content:
        "Stay up to date with your latest alerts, order updates and messages from Debridgers.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

/* Page and data are both shared; the role is the only thing this file decides. */
export default function AgentNotifications() {
  const props = useNotificationsService({ role: "agent" });

  return <NotificationsPage {...props} />;
}
