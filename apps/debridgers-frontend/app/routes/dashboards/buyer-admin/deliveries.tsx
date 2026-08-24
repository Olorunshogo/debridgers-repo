import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Truck } from "lucide-react";
import { apiFetch, apiMutate } from "@debridgers/api-client";
import { DashSearchInput } from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Manage Deliveries | Buyer Admin" },
    {
      name: "description",
      content: "Track and confirm order deliveries. Mark orders as delivered.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface Order {
  id: number;
  buyer_name: string;
  buyer_email: string;
  status: "out_for_delivery" | "delivered" | "pending" | "confirmed";
  total_amount: number;
  created_at: string;
}

type StatusColor = {
  bg: string;
  text: string;
  icon: typeof Check | typeof Clock | typeof Truck;
};
const STATUS_COLORS: Record<string, StatusColor> = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", icon: Clock },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", icon: Clock },
  out_for_delivery: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    icon: Truck,
  },
  delivered: { bg: "bg-green-50", text: "text-green-700", icon: Check },
};

export default function BuyerAdminDeliveries() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const data = await apiFetch<{ data: Order[] }>("/admin/orders");
      setOrders(data.data || []);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkDelivered(orderId: number) {
    setActioningId(orderId);
    try {
      await apiMutate("/admin/orders/" + orderId + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "delivered" }),
      });
      await loadOrders();
    } catch (error) {
      console.error("Failed to mark as delivered:", error);
    } finally {
      setActioningId(null);
    }
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.buyer_email.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toString().includes(search),
  );

  const pendingDeliveries = filteredOrders.filter(
    (o) => o.status === "out_for_delivery" || o.status === "confirmed",
  );

  if (loading) {
    return <div className="py-8 text-center">Loading orders...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <DashSearchInput
          placeholder="Search by buyer name, email, or order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      {pendingDeliveries.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800">
            🚚 {pendingDeliveries.length} order(s) awaiting delivery
            confirmation
          </p>
        </div>
      )}

      <div className="border-gray-border rounded-2xl border bg-white">
        <div className="border-gray-border border-b px-6 py-4">
          <h2 className="font-syne text-heading text-lg font-semibold">
            Orders ({filteredOrders.length})
          </h2>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-gray-border border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Ordered
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredOrders.map((order) => {
                    const statusConfig =
                      STATUS_COLORS[order.status] || STATUS_COLORS["pending"];
                    const StatusIcon = statusConfig.icon;
                    const canMarkDelivered =
                      order.status === "out_for_delivery" ||
                      order.status === "confirmed";

                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-gray-border border-b hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 font-mono text-xs">
                          #{order.id}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{order.buyer_name}</p>
                            <p className="text-xs text-gray-500">
                              {order.buyer_email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          ₦{(order.total_amount / 100).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={`${statusConfig.bg} ${statusConfig.text} inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium`}
                          >
                            <StatusIcon size={14} />
                            {order.status.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {canMarkDelivered ? (
                            <button
                              onClick={() => handleMarkDelivered(order.id)}
                              disabled={actioningId === order.id}
                              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-green-700 disabled:bg-gray-400"
                            >
                              {actioningId === order.id
                                ? "Confirming..."
                                : "Mark Delivered"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {order.status === "delivered"
                                ? "✓ Delivered"
                                : "—"}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
