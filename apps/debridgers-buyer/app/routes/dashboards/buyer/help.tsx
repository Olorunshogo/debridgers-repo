import { useEffect, useState } from "react";
import { apiFetch } from "@debridgers/api-client";
import { HelpCenter, buyerHelpContent } from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Help Center | Debridgers",
    description:
      "Get help with your Debridgers buyer account: FAQs, order support, and more.",
    path: "/help",
    noIndex: true,
  });
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
