import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { apiFetch, publicRequest } from "@debridgers/api-client";
import { useCart, LAST_ORDER_STORAGE_KEY } from "../../../features/cart";
import {
  formatCurrency,
  formatFromKobo,
  DashSelectInput,
  defaultStateName,
  stateSelectOptions,
  lgaSelectOptions,
  DashTextareaInput,
  DashSubmitButton,
} from "@debridgers/ui-web";

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

interface DeliveryZone {
  id: number;
  name: string;
  delivery_fee: number;
  free_delivery: boolean;
  areas: string[];
}

/* Mirrors the quote endpoint's response - see delivery-fee.ts on the backend. */
interface OrderQuote {
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  deliveryFeeBeforePromoKobo: number;
  handlingFeeKobo: number;
  totalKobo: number;
  freeDelivery: boolean;
  extraPackages: number;
  package_count: number;
}

/* Long enough that changing zone or quantity a few times is one request. */
const QUOTE_DEBOUNCE_MS = 400;

const steps: { key: Step; label: string }[] = [
  { key: "delivery", label: "Delivery" },
  { key: "confirmed", label: "Confirmed" },
];

interface WalletInfo {
  wallet: {
    available_balance: number;
    pending_balance: number;
    total_deposited: number;
  };
  transactions: unknown[];
  pagination: unknown;
}

export default function BuyerCheckout() {
  const { items: cartItems, subtotal, clear } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("delivery");
  /* Confirming the Paystack return, distinct from submitting a new order. */
  const [confirming, setConfirming] = useState<boolean>(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<"today" | "tomorrow">(
    "today",
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  /* State is fixed to the launch state by default; LGA narrows the zone list. */
  const [stateName, setStateName] = useState<string>(defaultStateName);
  const [lga, setLga] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  /* Kept while a new quote is in flight so the totals never flash empty. */
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoting, setQuoting] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  /* Payment method selection */
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletLoading, setWalletLoading] = useState<boolean>(true);

  /* Read inside the confirmation effect, which must not re-run as the cart
     changes or it would fire a second confirmation mid-flight. */
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;

  // === Delivery zones
  useEffect(() => {
    publicRequest<DeliveryZone[]>("/zones")
      .then(setZones)
      .catch(() => setZones([]));
  }, []);

  // === Wallet balance
  useEffect(() => {
    apiFetch<WalletInfo>("/buyer/wallet")
      .then((res) => {
        setWallet(res);
      })
      .catch(() => {
        setWallet(null);
      })
      .finally(() => setWalletLoading(false));
  }, []);

  /*
   * Zones that serve the chosen LGA. The seeded zones are named after LGAs
   * ("Kaduna South") and also list their areas, so match on either - the same
   * rule the backend uses to resolve a zone, kept in step deliberately.
   */
  const zonesForLga = useMemo(() => {
    if (!lga) return [];
    const target = lga.trim().toLowerCase();
    return zones.filter(
      (zone) =>
        zone.name.trim().toLowerCase() === target ||
        zone.areas.some((area) => area.trim().toLowerCase() === target),
    );
  }, [zones, lga]);

  /* Auto-select the only serving zone, and drop a stale one when LGA changes. */
  useEffect(() => {
    if (zonesForLga.length === 1) {
      setZoneId(String(zonesForLga[0].id));
      return;
    }
    setZoneId((current) =>
      zonesForLga.some((z) => String(z.id) === current) ? current : "",
    );
  }, [zonesForLga]);

  /*
   * Live quote. The server owns the pricing - delivery is a zone base plus a
   * per-package charge, and a promo can zero it - so the summary asks rather
   * than recomputing it here and risking a number that differs from the charge.
   */
  useEffect(() => {
    if (!zoneId || cartItems.length === 0) {
      setQuote(null);
      return;
    }

    setQuoting(true);
    const timer = window.setTimeout(() => {
      apiFetch<OrderQuote>("/buyer/cart/quote", {
        method: "POST",
        body: JSON.stringify({
          zone_id: Number(zoneId),
          cart: cartItems.map((i) => ({
            product_id: Number(i.id),
            qty: i.qty,
          })),
        }),
      })
        .then((next) => {
          setQuote(next);
          setQuoteError(null);
        })
        .catch((err: unknown) => {
          setQuoteError(
            err instanceof Error
              ? err.message
              : "Could not price this order right now.",
          );
        })
        .finally(() => setQuoting(false));
    }, QUOTE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [zoneId, cartItems]);

  /*
   * Return leg from Paystack. Arriving here proves the buyer came back, not
   * that they paid - Paystack sends the same callback when a card is declined
   * or the page is abandoned. So the reference is confirmed with the server
   * before anything is treated as bought, and the cart survives a failure.
   */
  useEffect(() => {
    const ref = searchParams.get("trxref") ?? searchParams.get("reference");
    if (!ref) return;

    let cancelled = false;
    setConfirming(true);

    apiFetch<{ order_id: number; payment_status: string }>(
      "/buyer/orders/confirm-payment",
      { method: "POST", body: JSON.stringify({ reference: ref }) },
    )
      .then(() => {
        if (cancelled) return;
        /* Snapshot before clearing so "repeat last order" has something to
           restore. Taken from the shared cart rather than re-reading storage. */
        if (cartItemsRef.current.length > 0) {
          localStorage.setItem(
            LAST_ORDER_STORAGE_KEY,
            JSON.stringify(cartItemsRef.current),
          );
        }
        clear();
        setStep("confirmed");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "We could not confirm that payment. Your cart has been kept.",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setConfirming(false);
        /* Drop the reference so a refresh cannot replay this confirmation. */
        setSearchParams(
          (params) => {
            params.delete("trxref");
            params.delete("reference");
            return params;
          },
          { replace: true },
        );
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, clear]);

  async function handleContinue(e: React.SyntheticEvent) {
    e.preventDefault();
    if (cartItems.length === 0 || !deliveryAddress.trim() || !zoneId) return;
    setError(null);
    setLoading(true);

    try {
      if (paymentMethod === "wallet") {
        // Wallet payment: create order then deduct from wallet
        const orderRes = await apiFetch<{
          order_id: number;
          total_kobo: number;
        }>("/buyer/orders", {
          method: "POST",
          body: JSON.stringify({
            delivery_address: deliveryAddress.trim(),
            zone_id: zoneId ? Number(zoneId) : undefined,
            delivery_time: deliveryTime,
            cart: cartItems.map((i) => ({
              product_id: Number(i.id),
              name: i.name,
              price_kobo: Math.round(i.price * 100),
              unit: i.unit,
              qty: i.qty,
            })),
          }),
        });

        const orderId = orderRes.order_id;
        const amount = orderRes.total_kobo;

        // Check if wallet has enough balance
        if (!wallet || wallet.wallet.available_balance < amount) {
          const errorMsg = !wallet
            ? "Wallet not loaded. Please refresh and try again."
            : `Insufficient wallet balance. Need ₦${Math.round(amount / 100)}, have ₦${Math.round(wallet.wallet.available_balance / 100)}`;
          setError(errorMsg);
          setLoading(false);
          return;
        }

        // Deduct from wallet
        const paymentPayload = {
          payment_method: "wallet",
          amount_kobo: amount,
        };
        await apiFetch(`/buyer/orders/${orderId}/pay`, {
          method: "POST",
          body: JSON.stringify(paymentPayload),
        });

        // Success - clear cart and show confirmation
        if (cartItems.length > 0) {
          localStorage.setItem(
            LAST_ORDER_STORAGE_KEY,
            JSON.stringify(cartItems),
          );
        }
        clear();
        setStep("confirmed");
      } else {
        // Card payment: initialize Paystack
        const res = await apiFetch<{
          authorization_url: string;
          reference: string;
          order_id: number;
          /* Same figures as the quote, minus package_count. */
          totals: Omit<OrderQuote, "package_count">;
        }>("/buyer/orders/initialize-payment", {
          method: "POST",
          body: JSON.stringify({
            delivery_address: deliveryAddress.trim(),
            zone_id: zoneId ? Number(zoneId) : undefined,
            delivery_time: deliveryTime,
            cart: cartItems.map((i) => ({
              product_id: Number(i.id),
              name: i.name,
              price_kobo: Math.round(i.price * 100),
              unit: i.unit,
              qty: i.qty,
            })),
          }),
        });
        window.location.href = res.authorization_url;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process payment. Please try again.",
      );
      setLoading(false);
    }
  }

  /* Hides the form while the return leg settles, so the buyer cannot pay twice. */
  if (confirming) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Loader2 size={40} className="text-primary animate-spin" />
        <h2 className="font-syne text-heading text-xl font-bold">
          Confirming your payment
        </h2>
        <p className="text-text max-w-87.5 text-sm">
          This only takes a moment. Please do not close this page.
        </p>
      </div>
    );
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
          Your payment was received. We&apos;ll notify you when your order is
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
    <div className="flex max-w-250 flex-col gap-6">
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

            {/* State -> LGA -> Zone, narrowing at each step for a precise address */}
            <div className="grid gap-4 lg:grid-cols-2">
              <DashSelectInput
                label="State"
                required
                value={stateName}
                options={stateSelectOptions()}
                onChange={(e) => {
                  setStateName(e.target.value);
                  /* LGAs are state-specific, so a stale one must not survive. */
                  setLga("");
                  setZoneId("");
                }}
              />

              <DashSelectInput
                label="LGA"
                required
                value={lga}
                placeholder="Choose your LGA"
                options={lgaSelectOptions(stateName)}
                onChange={(e) => setLga(e.target.value)}
              />
            </div>

            <DashSelectInput
              label="Delivery area"
              required
              value={zoneId}
              placeholder={
                !lga
                  ? "Choose an LGA first"
                  : zonesForLga.length === 0
                    ? "We do not deliver here yet"
                    : "Choose your area"
              }
              disabled={!lga || zonesForLga.length === 0}
              options={zonesForLga.map((zone) => ({
                value: String(zone.id),
                label: zone.free_delivery
                  ? `${zone.name} - free delivery`
                  : `${zone.name} - ${formatFromKobo(zone.delivery_fee)}`,
              }))}
              onChange={(e) => setZoneId(e.target.value)}
            />

            {lga && zonesForLga.length === 0 && (
              <p className="text-status-cancelled-text text-xs">
                We do not deliver to {lga} yet. Pick another LGA or contact
                support.
              </p>
            )}
            <DashTextareaInput
              label="Full delivery address"
              required
              aria-required="true"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter your full delivery address..."
              rows={3}
            />
          </div>

          <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
            <h3 className="font-syne text-heading font-semibold">
              Payment Method
            </h3>
            <div className="flex gap-3">
              {[
                {
                  key: "card" as const,
                  label: "Pay with Card",
                  sub: "Paystack",
                },
                {
                  key: "wallet" as const,
                  label: "Pay with Wallet",
                  sub: wallet
                    ? `Balance: ${formatFromKobo(wallet.wallet.available_balance)}`
                    : "Loading...",
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
                    paymentMethod === opt.key
                      ? "border-primary bg-dash-quick-action-hover"
                      : "border-gray-border bg-transparent"
                  } ${
                    opt.key === "wallet" && walletLoading ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={opt.key}
                    checked={paymentMethod === opt.key}
                    onChange={() => setPaymentMethod(opt.key)}
                    disabled={opt.key === "wallet" && walletLoading}
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

            <DashTextareaInput
              label="Delivery Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g. Call me when you arrive..."
              rows={2}
            />
          </div>
        </div>

        {/* Right: Order summary */}
        <div className="border-gray-border flex flex-col gap-4 rounded-2xl border bg-white p-5">
          <h3 className="font-syne text-heading font-semibold">
            Order Summary
          </h3>

          <div className="flex h-full flex-1 flex-col gap-3">
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
                    {item.name} x{item.qty} {item.unit}
                  </span>
                  <span className="text-heading">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="border-gray-border flex flex-col gap-2 border-t pt-3">
              <div className="text-text flex justify-between text-sm">
                <span>Subtotal</span>
                <span>
                  {quote
                    ? formatFromKobo(quote.itemsTotalKobo)
                    : formatCurrency(subtotal)}
                </span>
              </div>

              {/*
                Delivery is priced server-side and only known once an area is
                chosen. Saying "Free" before then, as this used to, was simply
                wrong once per-package pricing landed.
              */}
              <div className="text-text flex justify-between gap-3 text-sm">
                <span>
                  Delivery
                  {quote && quote.extraPackages > 0 && (
                    <span className="text-text-placeholder">
                      {" "}
                      ({quote.package_count} packages)
                    </span>
                  )}
                </span>
                {!zoneId ? (
                  <span className="text-text-placeholder">Choose an area</span>
                ) : quote?.freeDelivery ? (
                  <span className="flex items-center gap-1.5">
                    <s className="text-text-placeholder">
                      {formatFromKobo(quote.deliveryFeeBeforePromoKobo)}
                    </s>
                    <span className="text-status-delivered-text font-semibold">
                      FREE
                    </span>
                  </span>
                ) : quote ? (
                  <span>{formatFromKobo(quote.deliveryFeeKobo)}</span>
                ) : (
                  <span className="text-text-placeholder">...</span>
                )}
              </div>

              {quote && (
                <div className="text-text flex justify-between text-sm">
                  <span>Handling</span>
                  <span>{formatFromKobo(quote.handlingFeeKobo)}</span>
                </div>
              )}

              <div className="font-syne text-heading flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className={quoting ? "opacity-50" : undefined}>
                  {quote
                    ? formatFromKobo(quote.totalKobo)
                    : formatCurrency(subtotal)}
                </span>
              </div>

              {quoteError && (
                <p className="text-status-cancelled-text text-xs">
                  {quoteError}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <DashSubmitButton
            variant="primary"
            loading={loading}
            loadingText={`Processing ${paymentMethod === "wallet" ? "wallet" : "card"} payment...`}
            disabled={
              cartItems.length === 0 ||
              !deliveryAddress.trim() ||
              !zoneId ||
              (paymentMethod === "wallet" && walletLoading)
            }
            className="flex"
          >
            {paymentMethod === "wallet" ? "Pay with Wallet" : "Pay with Card"}
            <ArrowRight size={16} />
          </DashSubmitButton>
          <p className="text-text text-center text-xs">
            {paymentMethod === "wallet"
              ? "Payment will be deducted from your wallet."
              : "You'll be redirected to Paystack to complete payment securely."}
          </p>
        </div>
      </form>
    </div>
  );
}
