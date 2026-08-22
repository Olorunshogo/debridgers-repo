import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, Check } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import { DashSearchInput } from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Manage Buyers | Buyer Admin" },
    {
      name: "description",
      content:
        "View and manage all buyers. Suspend or unsuspend buyer accounts.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface Buyer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_suspended: boolean;
  is_email_verified: boolean;
  joined_at: string;
}

export default function BuyerAdminBuyers() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadBuyers();
  }, []);

  async function loadBuyers() {
    try {
      const data = await apiFetch<Buyer[]>("/admin/buyers");
      setBuyers(data);
    } catch (error) {
      console.error("Failed to load buyers:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredBuyers = buyers.filter(
    (buyer) =>
      `${buyer.first_name} ${buyer.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      buyer.email.toLowerCase().includes(search.toLowerCase()),
  );

  const activeBuyers = filteredBuyers.filter((b) => !b.is_suspended);
  const suspendedBuyers = filteredBuyers.filter((b) => b.is_suspended);

  if (loading) {
    return <div className="py-8 text-center">Loading buyers...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <DashSearchInput
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="border-gray-border rounded-2xl border bg-white p-4">
          <p className="text-text mb-2 text-sm">Total Buyers</p>
          <p className="font-syne text-heading text-2xl font-bold">
            {filteredBuyers.length}
          </p>
        </div>
        <div className="border-gray-border rounded-2xl border bg-white p-4">
          <p className="text-text mb-2 text-sm">Active</p>
          <p className="font-syne text-heading text-2xl font-bold text-green-600">
            {activeBuyers.length}
          </p>
        </div>
        <div className="border-gray-border rounded-2xl border bg-white p-4">
          <p className="text-text mb-2 text-sm">Suspended</p>
          <p className="font-syne text-heading text-2xl font-bold text-red-600">
            {suspendedBuyers.length}
          </p>
        </div>
      </div>

      <div className="border-gray-border rounded-2xl border bg-white">
        <div className="border-gray-border border-b px-6 py-4">
          <h2 className="font-syne text-heading text-lg font-semibold">
            Buyers ({filteredBuyers.length})
          </h2>
        </div>

        {filteredBuyers.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No buyers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-gray-border border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Verified
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredBuyers.map((buyer) => (
                    <motion.tr
                      key={buyer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-gray-border border-b hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium">
                        {buyer.first_name} {buyer.last_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{buyer.email}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {buyer.phone || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                            buyer.is_suspended
                              ? "bg-red-50 text-red-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {buyer.is_suspended ? (
                            <>
                              <Ban size={14} /> Suspended
                            </>
                          ) : (
                            <>
                              <Check size={14} /> Active
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {buyer.is_email_verified ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(buyer.joined_at).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
