import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { BASE_BACKEND_URL } from "../../../utils/api";

export function meta() {
  return [{ title: "Checkout | Debridgers" }];
}

type Step = "cart" | "delivery" | "payment" | "confirmed";

interface Address {
  id: string;
  label: string;
  full: string;
  isDefault: boolean;
}

const MOCK_ADDRESSES: Address[] = [
  {
    id: "1",
    label: "Home — Default",
    full: "10 Barnawa Close, off Rabah Road, Barnawa, Kaduna South",
    isDefault: true,
  },
  {
    id: "2",
    label: "Shop — Backup",
    full: "14 Business Drive, off Rabah Road, Barnawa, Kaduna South",
    isDefault: false,
  },
];

const MOCK_ITEMS = [
  { name: "Parboiled Rice", qty: 2, unit: "kg", price: 2400 },
  { name: "Parboiled Rice", qty: 3, unit: "kg", price: 3600 },
  { name: "Parboiled Rice", qty: 2, unit: "kg", price: 2400 },
];

const steps: { key: Step; label: string }[] = [
  { key: "cart", label: "Cart" },
  { key: "delivery", label: "Delivery" },
  { key: "payment", label: "Payment" },
  { key: "confirmed", label: "Confirmed" },
];

function formatNaira(n: number) {
  return `₦${n.toLocaleString()}`;
}

export default function BuyerCheckout() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("delivery");
  const [selectedAddress, setSelectedAddress] = useState("1");
  const [deliveryTime, setDeliveryTime] = useState<"today" | "tomorrow">(
    "today",
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const subtotal = MOCK_ITEMS.reduce((s, i) => s + i.price, 0);

  async function handleContinue() {
    setLoading(true);
    try {
      // === PRODUCTION
      // const res = await fetch(`${BASE_BACKEND_URL}/buyer/orders`, {
      //   method: "POST",
      //   credentials: "include",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ addressId: selectedAddress, deliveryTime, note }),
      // });
      // if (!res.ok) throw new Error("Order failed");

      // === MOCK
      await new Promise<void>((r) => setTimeout(r, 1000));
      setStep("confirmed");
    } catch {
      // handle error
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
        <h2 className="font-syne text-heading text-2xl font-bold">
          Order Confirmed!
        </h2>
        <p className="text-text max-w-[350px] text-sm">
          Your order has been placed. We&apos;ll notify you when it&apos;s
          picked up.
        </p>
        <Link
          to="/buyer-dashboard"
          className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--primary-color)" }}
        >
          Back to Dashboard
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {/* Progress steps */}
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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Delivery form */}
        <div className="flex flex-col gap-5">
          {/* Delivery Address */}
          <div
            className="flex flex-col gap-4 rounded-2xl border p-5"
            style={{
              borderColor: "var(--border-gray)",
              backgroundColor: "var(--white)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="font-syne font-semibold"
                style={{ color: "var(--heading-colour)" }}
              >
                Delivery Address
              </h3>
              <button
                className="text-sm underline underline-offset-2"
                style={{ color: "var(--primary-color)" }}
              >
                New address +
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {MOCK_ADDRESSES.map((addr) => (
                <label
                  key={addr.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors"
                  style={{
                    borderColor:
                      selectedAddress === addr.id
                        ? "var(--primary-color)"
                        : "var(--border-gray)",
                    backgroundColor:
                      selectedAddress === addr.id
                        ? "var(--dash-quick-action-hover)"
                        : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={selectedAddress === addr.id}
                    onChange={() => setSelectedAddress(addr.id)}
                    className="mt-0.5"
                    style={{ accentColor: "var(--primary-color)" }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--heading-colour)" }}
                    >
                      {addr.label}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-colour)" }}
                    >
                      {addr.full}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Time */}
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
              Delivery Delivery Time
            </h3>
            <div className="flex gap-3">
              {[
                { key: "today" as const, label: "Today", sub: "Before 12 Pm" },
                {
                  key: "tomorrow" as const,
                  label: "Tomorrow",
                  sub: "Between 9 - 5",
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
                placeholder="Eg: Call me when you arrive, Please..."
                rows={3}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm transition-all duration-200 outline-none"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--heading-colour)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--input-border-focus)";
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
          <div className="flex items-center justify-between">
            <h3
              className="font-syne font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              Order summary
            </h3>
            <button
              className="text-xs underline underline-offset-2"
              style={{ color: "var(--primary-color)" }}
            >
              Edit
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {MOCK_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span style={{ color: "var(--text-colour)" }}>
                  {item.name} {item.qty}
                  {item.unit}
                </span>
                <span style={{ color: "var(--heading-colour)" }}>
                  {formatNaira(item.price)}
                </span>
              </div>
            ))}
          </div>

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

          <button
            onClick={handleContinue}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--primary-color)" }}
          >
            {loading ? "Processing..." : "Continue to payment →"}
          </button>
        </div>
      </div>
    </div>
  );
}
