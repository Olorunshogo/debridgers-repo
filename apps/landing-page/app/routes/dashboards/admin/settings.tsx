export function meta() {
  return [
    { title: "Settings | Debridgers Admin" },
    {
      name: "description",
      content:
        "Manage Debridgers platform settings and administrative configurations.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}
export default function AdminSettings() {
  return <div className="flex flex-col gap-4" />;
}
