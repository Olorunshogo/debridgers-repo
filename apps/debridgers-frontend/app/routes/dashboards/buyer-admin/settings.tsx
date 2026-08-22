export function meta() {
  return [
    { title: "Settings | Buyer Admin" },
    {
      name: "description",
      content: "Buyer admin account settings and preferences.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function BuyerAdminSettings() {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-gray-border rounded-2xl border bg-white p-6">
        <h2 className="font-syne text-heading mb-4 text-lg font-semibold">
          Account Settings
        </h2>
        <p className="text-text text-sm">
          Settings page for buyer admin. More features coming soon.
        </p>
      </div>
    </div>
  );
}
