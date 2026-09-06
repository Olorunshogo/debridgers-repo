import { useAuth } from "@debridgers/ui-web";
import { HelpCenter, agentHelpContent } from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Help Center | Debridgers Agent",
    description:
      "Get help with your Debridgers agent account: FAQs, agent guidelines, and support.",
    path: "/help",
    noIndex: true,
  });
}

// === Page

export default function AgentHelpPage() {
  const { user } = useAuth();

  return (
    <HelpCenter
      heading="Help Center"
      subheading="Answers to common questions for agents"
      content={agentHelpContent}
      defaultEmail={user?.email}
    />
  );
}
