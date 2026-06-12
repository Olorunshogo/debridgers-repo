import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [
    { title: "Checkout | Debridgers" },
    {
      name: "description",
      content:
        "Review and confirm your Debridgers order before completing your purchase.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

type Step = "delivery" | "confirmed";

interface CartItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
}

const steps: { key: Step; label: string }[] = [
  { key: "delivery", label: "Delivery" },
  { key: "confirmed", label: "Confirmed" },
];

function formatNaira(n: number) {
  return `₦${n.toLocaleString()}`;
}

export default function BuyerCheckout() {
  const [step, setStep] = useState<Step>("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<"today" | "tomorrow">(
    "today",
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("debridgers_cart");
      if (saved) setCartItems(JSON.parse(saved) as CartItem[]);
    } catch {
      setCartItems([]);
    }
    apiFetch<{ first_name: string; last_name: string; email: string }>(
      "/buyer/me",
    )
      .then(() => {})
      .catch(() => {});
  }, []);

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0 || !deliveryAddress.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);
      await apiFetch("/buyer/orders", {
        method: "POST",
        body: JSON.stringify({
          quantity: totalQty,
          total_amount_kobo: subtotal * 100,
          delivery_address: deliveryAddress.trim(),
          notes: note.trim() || undefined,
        }),
      });
      localStorage.removeItem("debridgers_cart");
      setStep("confirmed");
    } catch {
      setError("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "confirmed") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 py-16 text-center"
      >
        <CheckCircle2 size={64} className="text-primary" />
        <h2 className="font-syne text-heading text-2xl font-bold">
          Order Confirmed!
        </h2>
        <p className="text-text max-w-87.5 text-sm">
          Your order has been placed. We&apos;ll notify you when it&apos;s
          picked up.
        </p>
        <Link
          to="/buyer-dashboard/orders"
          className="bg-primary rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          View My Orders
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                step === s.key
                  ? "bg-primary text-white"
                  : "bg-bg-light text-text"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-text text-sm">{s.label}</span>
            {i < steps.length - 1 && (
              <div className="bg-gray-border h-px w-8" />
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleContinue}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        {/* Left: Delivery form */}
        <div className="flex flex-col gap-5">
          <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
            <h3 className="font-syne text-heading font-semibold">
              Delivery Address
            </h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-heading text-sm font-medium">
                Full delivery address <span className="text-error-red">*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your full delivery address..."
                rows={3}
                required
                className="border-gray-border focus:border-primary text-heading w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm transition-all duration-200 outline-none"
              />
            </div>
          </div>

          <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
            <h3 className="font-syne text-heading font-semibold">
              Delivery Time
            </h3>
            <div className="flex gap-3">
              {[
                { key: "today" as const, label: "Today", sub: "Before 12pm" },
                {
                  key: "tomorrow" as const,
                  label: "Tomorrow",
                  sub: "Between 9am – 5pm",
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
                    deliveryTime === opt.key
                      ? "border-primary bg-dash-quick-action-hover"
                      : "border-gray-border bg-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryTime"
                    value={opt.key}
                    checked={deliveryTime === opt.key}
                    onChange={() => setDeliveryTime(opt.key)}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-heading text-sm font-medium">
                      {opt.label}
                    </p>
                    <p className="text-text text-xs">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-heading text-sm font-medium">
                Delivery Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g. Call me when you arrive..."
                rows={2}
                className="border-gray-border focus:border-primary text-heading w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm transition-all duration-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Order summary */}
        <div className="border-gray-border flex h-fit flex-col gap-4 rounded-2xl border bg-white p-5">
          <h3 className="font-syne text-heading font-semibold">
            Order Summary
          </h3>

          <div className="flex flex-col gap-3">
            {cartItems.length === 0 ? (
              <p className="text-text text-sm">
                Your cart is empty.{" "}
                <Link
                  to="/buyer-dashboard/shop"
                  className="text-primary underline underline-offset-2"
                >
                  Go back to shop
                </Link>
              </p>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text">
                    {item.name} {item.qty}
                    {item.unit.replace("per ", "")}
                  </span>
                  <span className="text-heading">
                    {formatNaira(item.price * item.qty)}
                  </span>
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="border-gray-border flex flex-col gap-2 border-t pt-3">
              <div className="text-text flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div className="text-text flex justify-between text-sm">
                <span>Delivery</span>
                <span className="text-status-delivered-text">Free</span>
              </div>
              <div className="font-syne text-heading flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
            </div>
          )}

          {error && (
            <p className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loading || cartItems.length === 0 || !deliveryAddress.trim()
            }
            className="bg-primary flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Placing order..." : "Place Order →"}
          </button>
        </div>
      </form>
    </div>
  );
}
