import { useEffect, useState } from "react";
import { apiFetch } from "@debridgers/api-client";
import { HelpCenter, buyerHelpContent } from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Help Center | Debridgers" },
    {
      name: "description",
      content:
        "Get help with your Debridgers buyer account: FAQs, order support, and more.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// === Types

interface BuyerProfile {
  first_name: string;
  last_name: string;
  email: string;
}

// === Page

export default function BuyerHelpPage() {
  const [profile, setProfile] = useState<BuyerProfile | null>(null);

  /* Only used to pre-fill the support form, so a failure is not worth surfacing. */
  useEffect(() => {
    apiFetch<BuyerProfile>("/buyer/me")
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  return (
    <HelpCenter
      heading="Help Center"
      subheading="Answers to common questions for buyers"
      content={buyerHelpContent}
      defaultName={
        profile
          ? `${profile.first_name} ${profile.last_name}`.trim()
          : undefined
      }
      defaultEmail={profile?.email}
    />
  );
}
