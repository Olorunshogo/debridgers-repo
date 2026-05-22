import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";

export function meta() {
  return [{ title: "Checkout | Debridgers" }];
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
        <CheckCircle2 size={64} style={{ color: "var(--primary-color)" }} />
        <h2
          className="font-syne text-2xl font-bold"
          style={{ color: "var(--heading-colour)" }}
        >
          Order Confirmed!
        </h2>
        <p
          className="max-w-[350px] text-sm"
          style={{ color: "var(--text-colour)" }}
        >
          Your order has been placed. We&apos;ll notify you when it&apos;s
          picked up.
        </p>
        <Link
          to="/buyer-dashboard/orders"
          className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--primary-color)" }}
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
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300"
              style={{
                backgroundColor:
                  step === s.key ? "var(--primary-color)" : "var(--bg-light)",
                color: step === s.key ? "white" : "var(--text-colour)",
              }}
            >
              {i + 1}
            </div>
            <span className="text-sm" style={{ color: "var(--text-colour)" }}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className="h-px w-8"
                style={{ backgroundColor: "var(--border-gray)" }}
              />
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
          <div
            className="flex flex-col gap-4 rounded-2xl border p-5"
            style={{
              borderColor: "var(--border-gray)",
              backgroundColor: "var(--white)",
            }}
          >
            <h3
              className="font-syne font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              Delivery Address
            </h3>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--heading-colour)" }}
              >
                Full delivery address{" "}
                <span style={{ color: "var(--error-red)" }}>*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your full delivery address..."
                rows={3}
                required
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm transition-all duration-200 outline-none"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--heading-colour)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary-color)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-gray)";
                }}
              />
            </div>
          </div>

          <div
            className="flex flex-col gap-4 rounded-2xl border p-5"
            style={{
              borderColor: "var(--border-gray)",
              backgroundColor: "var(--white)",
            }}
          >
            <h3
              className="font-syne font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
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
                  className="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 transition-colors"
                  style={{
                    borderColor:
                      deliveryTime === opt.key
                        ? "var(--primary-color)"
                        : "var(--border-gray)",
                    backgroundColor:
                      deliveryTime === opt.key
                        ? "var(--dash-quick-action-hover)"
                        : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="deliveryTime"
                    value={opt.key}
                    checked={deliveryTime === opt.key}
                    onChange={() => setDeliveryTime(opt.key)}
                    style={{ accentColor: "var(--primary-color)" }}
                  />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {opt.label}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {opt.sub}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--heading-colour)" }}
              >
                Delivery Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="E.g. Call me when you arrive..."
                rows={2}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm transition-all duration-200 outline-none"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--heading-colour)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary-color)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-gray)";
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Order summary */}
        <div
          className="flex h-fit flex-col gap-4 rounded-2xl border p-5"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <h3
            className="font-syne font-semibold"
            style={{ color: "var(--heading-colour)" }}
          >
            Order Summary
          </h3>

          <div className="flex flex-col gap-3">
            {cartItems.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-colour)" }}>
                Your cart is empty.{" "}
                <Link
                  to="/buyer-dashboard/shop"
                  className="underline underline-offset-2"
                  style={{ color: "var(--primary-color)" }}
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
                  <span style={{ color: "var(--text-colour)" }}>
                    {item.name} {item.qty}
                    {item.unit.replace("per ", "")}
                  </span>
                  <span style={{ color: "var(--heading-colour)" }}>
                    {formatNaira(item.price * item.qty)}
                  </span>
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div
              className="flex flex-col gap-2 border-t pt-3"
              style={{ borderColor: "var(--border-gray)" }}
            >
              <div
                className="flex justify-between text-sm"
                style={{ color: "var(--text-colour)" }}
              >
                <span>Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div
                className="flex justify-between text-sm"
                style={{ color: "var(--text-colour)" }}
              >
                <span>Delivery</span>
                <span style={{ color: "var(--status-delivered-text)" }}>
                  Free
                </span>
              </div>
              <div
                className="font-syne flex justify-between text-lg font-bold"
                style={{ color: "var(--heading-colour)" }}
              >
                <span>Total</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
            </div>
          )}

          {error && (
            <p
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                backgroundColor: "var(--status-cancelled-bg)",
                color: "var(--status-cancelled-text)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loading || cartItems.length === 0 || !deliveryAddress.trim()
            }
            className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--primary-color)" }}
          >
            {loading ? "Placing order..." : "Place Order →"}
          </button>
        </div>
      </form>
    </div>
  );
}
