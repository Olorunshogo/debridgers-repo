import { useAuth } from "../../../contexts/AuthContext";
import { HelpCenter } from "../shared/HelpCenter";
import { agentHelpContent } from "../shared/help-content";

export function meta() {
  return [
    { title: "Help Center | Debridgers Agent" },
    {
      name: "description",
      content:
        "Get help with your Debridgers agent account: FAQs, agent guidelines, and support.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
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
