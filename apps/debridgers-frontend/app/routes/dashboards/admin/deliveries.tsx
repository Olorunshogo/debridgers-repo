import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Calendar, MapPin, User } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import { useNavigate } from "react-router";
import { DashSearchInput } from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Delivery Verification | Debridgers Admin" },
    {
      name: "description",
      content:
        "Verify and confirm buyer order deliveries. Upload proof of delivery and manage delivery status.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface DeliveryOrder {
  id: number;
  order_reference: string;
  buyer_name: string;
  buyer_phone: string;
  delivery_address: string;
  amount: number;
  created_at: string;
}

interface ApiDeliveriesResponse {
  orders: DeliveryOrder[];
  total: number;
}

export default function Deliveries() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<ApiDeliveriesResponse>("/admin/deliveries/pending")
      .then((data) => setOrders(data.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.order_reference.toLowerCase().includes(search.toLowerCase()) ||
          o.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
          o.delivery_address.toLowerCase().includes(search.toLowerCase()),
      ),
    [orders, search],
  );

  const stats = {
    pending: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + o.amount, 0),
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Truck size={24} className="text-primary" />
          <div>
            <h2 className="font-syne text-heading text-xl font-bold">
              Delivery Verification
            </h2>
            <p className="text-text text-sm">
              {loading ? "Loading..." : `${orders.length} pending deliveries`}
            </p>
          </div>
        </div>

        <DashSearchInput
          placeholder="Search by order or buyer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border-gray-border flex items-start gap-3 rounded-2xl border bg-white p-4">
          <Truck size={20} className="mt-1 text-amber-500" />
          <div className="flex-1">
            <p className="text-text text-xs font-semibold tracking-wider uppercase">
              Pending Verification
            </p>
            <p className="font-syne text-heading text-lg font-bold">
              {stats.pending}
            </p>
          </div>
        </div>
        <div className="border-gray-border flex items-start gap-3 rounded-2xl border bg-white p-4">
          <Calendar size={20} className="mt-1 text-blue-500" />
          <div className="flex-1">
            <p className="text-text text-xs font-semibold tracking-wider uppercase">
              Total Amount
            </p>
            <p className="font-syne text-heading text-lg font-bold">
              ₦{(stats.totalAmount / 100).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border-gray-border overflow-hidden rounded-2xl border bg-white">
        <div className="border-gray-border text-text grid grid-cols-[100px_1fr_1.2fr_100px_80px] gap-4 border-b px-5 py-3 text-xs font-semibold tracking-wider uppercase">
          <span>Order</span>
          <span>Buyer</span>
          <span>Delivery Address</span>
          <span>Amount</span>
          <span>Created</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`border-gray-border h-14 animate-pulse border-b ${
                  i % 2 === 0 ? "bg-bg-light" : "bg-white"
                }`}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-text px-5 py-8 text-center text-sm">
            {search
              ? "No deliveries match your search."
              : "No pending deliveries."}
          </p>
        ) : (
          <AnimatePresence>
            {filtered.map((order, i) => {
              const createdDate = new Date(order.created_at).toLocaleDateString(
                "en-NG",
                {
                  month: "short",
                  day: "numeric",
                },
              );
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-gray-border hover:bg-bg-light grid cursor-pointer grid-cols-[100px_1fr_1.2fr_100px_80px] gap-4 border-b px-5 py-4 text-sm transition-colors last:border-0"
                  onClick={() =>
                    navigate(`/dashboards/admin/deliveries/${order.id}/verify`)
                  }
                >
                  <div>
                    <p className="text-heading font-semibold">
                      {order.order_reference}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-heading font-semibold">
                      {order.buyer_name}
                    </p>
                    <div className="text-text flex items-center gap-1 text-xs">
                      <User size={12} />
                      {order.buyer_phone}
                    </div>
                  </div>

                  <div className="text-text flex items-start gap-1 truncate text-xs">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="truncate">{order.delivery_address}</span>
                  </div>

                  <span className="text-heading font-semibold">
                    ₦{(order.amount / 100).toLocaleString()}
                  </span>

                  <span className="text-text text-xs">{createdDate}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
