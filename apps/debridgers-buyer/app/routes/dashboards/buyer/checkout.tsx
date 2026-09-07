import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { apiFetch, publicRequest } from "@debridgers/api-client";
import { useCart, LAST_ORDER_STORAGE_KEY } from "../../../features/cart";
import { usePlatformConfig } from "../../../contexts/PlatformConfigContext";
import {
  formatCurrency,
  formatFromKobo,
  SelectInputField,
  defaultStateName,
  stateSelectOptions,
  lgaSelectOptions,
  TextareaField,
  SubmitButton,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Checkout | Debridgers",
    description:
      "Review and confirm your Debridgers order before completing your purchase.",
    path: "/checkout",
    noIndex: true,
  });
}

type Step = "delivery" | "confirmed";

interface DeliveryZone {
  id: number;
  name: string;
  delivery_fee: number;
  free_delivery: boolean;
  areas: string[];
}

/*
 * Mirrors the quote endpoint's response - see delivery-fee.ts on the backend.
 *
 * The server is the single, deliberate enforcer of the minimum order: it
 * rejects a below-minimum basket at order time. The client does not read or
 * surface `belowMinimumOrder` here on purpose, so there is one place that
 * decision lives rather than a client copy that can drift from the floor in
 * `@debridgers/pricing`.
 */
interface OrderQuote {
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  deliveryFeeBeforePromoKobo: number;
  /*
   * The cost-to-serve fee. `handlingFeeKobo` is the same value under the name
   * the orders table still uses; prefer this one in new code.
   */
  serviceFeeKobo: number;
  handlingFeeKobo: number;
  totalKobo: number;
  freeDelivery: boolean;
  extraPackages: number;
  package_count: number;
  /*
   * Set when the basket is past the tapered table and the delivery fee no
   * longer covers the vehicle. Computed and returned all along, and read by
   * nothing, so checkout sold these orders below cost in silence.
   */
  requiresIndividualQuote: boolean;
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
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  /* Same-day delivery is only offered before the noon dispatch cutoff. */
  const pastTodayCutoff: boolean = new Date().getHours() >= 12;
  const [deliveryTime, setDeliveryTime] = useState<"today" | "tomorrow">(
    pastTodayCutoff ? "tomorrow" : "today",
  );
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  /* State is fixed to the launch state by default; LGA narrows the zone list. */
  const [stateName, setStateName] = useState<string>(defaultStateName);
  const [lga, setLga] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  /* Kept while a new quote is in flight so the totals never flash empty. */
  /*
   * The running campaign and the minimum order, from the one place that knows
   * them. Both were already fetched by this provider and rendered nowhere.
   */
  const { deliveryPromotion } = usePlatformConfig();

  const promotionCoversZone = (zone: number): boolean =>
    !!deliveryPromotion && deliveryPromotion.zone_ids.includes(zone);

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

  /* setLoading does not take effect until the next render, so two fast clicks
     can both get past the loading check and create two orders. A ref flips
     synchronously. */
  const submittingRef = useRef<boolean>(false);

  /* Release both together - a cleared loading flag with the ref still set would
     lock the button for the rest of the session. */
  function stopSubmitting(): void {
    submittingRef.current = false;
    setLoading(false);
  }

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
          /* Drop the stale quote: showing the previous total next to an error
             is how a buyer ends up believing a price the server just refused. */
          setQuote(null);
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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      if (paymentMethod === "wallet") {
        /*
         * Balance is checked before the order exists, not after.
         *
         * Creating first and bailing on a shortfall left a pending, unpayable
         * order behind on every failed attempt. The quote is the same figure
         * the server will charge, so it is enough to decide this up front.
         */
        const expectedKobo = quote?.totalKobo;

        if (!wallet) {
          setError("Wallet not loaded. Please refresh and try again.");
          stopSubmitting();
          return;
        }

        if (
          expectedKobo !== undefined &&
          wallet.wallet.available_balance < expectedKobo
        ) {
          setError(
            `Insufficient wallet balance. This order is ${formatFromKobo(
              expectedKobo,
            )} and your balance is ${formatFromKobo(
              wallet.wallet.available_balance,
            )}.`,
          );
          stopSubmitting();
          return;
        }

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
            notes: note.trim() || undefined,
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

        /*
         * Re-checked against the server's own total. The pre-flight check used
         * the quote; this catches the case where the two disagree, and cancels
         * the order rather than leaving it pending and unpayable.
         */
        if (wallet.wallet.available_balance < amount) {
          await apiFetch(`/buyer/orders/${orderId}/cancel`, {
            method: "POST",
            body: JSON.stringify({ reason: "Insufficient wallet balance" }),
          }).catch(() => {
            /* Best effort. An uncancelled order is recoverable; a misleading
               success message is not. */
          });

          setError(
            `Insufficient wallet balance. This order is ${formatFromKobo(
              amount,
            )} and your balance is ${formatFromKobo(
              wallet.wallet.available_balance,
            )}.`,
          );
          stopSubmitting();
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
            notes: note.trim() || undefined,
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
      stopSubmitting();
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
        <p className="text-body max-w-87.5 text-sm">
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
        <p className="text-body max-w-87.5 text-sm">
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
                  : "bg-light-bg text-body"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-body text-sm">{s.label}</span>
            {i < steps.length - 1 && <div className="bg-line h-px w-8" />}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleContinue}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        {/* Left: Delivery form */}
        <div className="flex flex-col gap-5">
          <div className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5">
            <h3 className="font-syne text-heading font-semibold">
              Delivery Address
            </h3>

            {/* State -> LGA -> Zone, narrowing at each step for a precise address */}
            <div className="grid gap-4 lg:grid-cols-2">
              <SelectInputField
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

              <SelectInputField
                label="LGA"
                required
                value={lga}
                placeholder="Choose your LGA"
                options={lgaSelectOptions(stateName)}
                onChange={(e) => setLga(e.target.value)}
              />
            </div>

            <SelectInputField
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
              /*
                A running campaign is reflected here, not only once a quote
                returns. The picker used to read zone.free_delivery alone, so a
                global campaign was invisible at the moment of choosing.
              */
              options={zonesForLga.map((zone) => ({
                value: String(zone.id),
                label:
                  zone.free_delivery || promotionCoversZone(zone.id)
                    ? `${zone.name} - free delivery`
                    : `${zone.name} - ${formatFromKobo(zone.delivery_fee)}`,
              }))}
              onChange={(e) => setZoneId(e.target.value)}
            />

            {lga && zonesForLga.length === 0 && (
              <p className="text-status-cancelled-fg text-xs">
                We do not deliver to {lga} yet. Pick another LGA or contact
                support.
              </p>
            )}
            <TextareaField
              label="Full delivery address"
              required
              aria-required="true"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter your full delivery address..."
              rows={3}
            />
          </div>

          <div className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5">
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
                      : "border-line bg-transparent"
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
                    <p className="text-body text-xs">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5">
            <h3 className="font-syne text-heading font-semibold">
              Delivery Time
            </h3>
            <div className="flex gap-3">
              {[
                {
                  key: "today" as const,
                  label: "Today",
                  sub: pastTodayCutoff ? "Cutoff passed" : "Before 12pm",
                },
                {
                  key: "tomorrow" as const,
                  label: "Tomorrow",
                  sub: "Between 9am – 5pm",
                },
              ].map((opt) => {
                const disabled: boolean =
                  opt.key === "today" && pastTodayCutoff;
                return (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    } ${
                      deliveryTime === opt.key
                        ? "border-primary bg-dash-quick-action-hover"
                        : "border-line bg-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryTime"
                      value={opt.key}
                      checked={deliveryTime === opt.key}
                      disabled={disabled}
                      onChange={() => setDeliveryTime(opt.key)}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-heading text-sm font-medium">
                        {opt.label}
                      </p>
                      <p className="text-body text-xs">{opt.sub}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <TextareaField
              label="Delivery Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="E.g. Call me when you arrive..."
              rows={2}
            />
          </div>
        </div>

        {/* Right: Order summary */}
        <div className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5">
          <h3 className="font-syne text-heading font-semibold">
            Order Summary
          </h3>

          <div className="flex h-full flex-1 flex-col gap-3">
            {cartItems.length === 0 ? (
              <p className="text-body text-sm">
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
                  <span className="text-body">
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
            <div className="border-line flex flex-col gap-2 border-t pt-3">
              <div className="text-body flex justify-between text-sm">
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
              <div className="text-body flex justify-between gap-3 text-sm">
                <span>
                  Delivery
                  {quote && quote.extraPackages > 0 && (
                    <span className="text-placeholder-text">
                      {" "}
                      ({quote.package_count} packages)
                    </span>
                  )}
                </span>
                {/*
                  Four distinct states, not three. This used to render a bare
                  "..." for everything that was not a finished quote, so a
                  failed one sat there for ever while the reason appeared in
                  small red text underneath.
                */}
                {!zoneId ? (
                  <span className="text-placeholder-text">Choose an area</span>
                ) : quoteError ? (
                  <span className="text-status-cancelled-fg">Unavailable</span>
                ) : quoting || !quote ? (
                  <span className="text-placeholder-text">Calculating…</span>
                ) : quote.freeDelivery ? (
                  <span className="flex items-center gap-1.5">
                    <s className="text-placeholder-text">
                      {formatFromKobo(quote.deliveryFeeBeforePromoKobo)}
                    </s>
                    <span className="text-status-delivered-fg font-semibold">
                      FREE
                    </span>
                  </span>
                ) : (
                  <span>{formatFromKobo(quote.deliveryFeeKobo)}</span>
                )}
              </div>

              {/*
                Named for what it pays for. It was "Handling", which is why it
                was once set at 100 naira: it is not a charge for lifting a bag,
                it covers the payment rail and the admin around the order.
              */}
              {quote && (
                <div className="text-body flex justify-between text-sm">
                  <span>Service fee</span>
                  <span>{formatFromKobo(quote.serviceFeeKobo)}</span>
                </div>
              )}

              <div className="font-syne text-heading flex justify-between text-lg font-bold">
                <span>Total</span>
                {/*
                  No subtotal fallback. Falling back to the items total showed a
                  figure that excluded delivery and the service fee, so a buyer
                  whose quote had failed was shown less than they would be
                  charged. Better to show nothing than a number that is wrong.
                */}
                <span className={quoting ? "opacity-50" : undefined}>
                  {quote ? (
                    formatFromKobo(quote.totalKobo)
                  ) : (
                    <span className="text-placeholder-text text-sm font-normal">
                      {quoteError ? "Unavailable" : "Calculating…"}
                    </span>
                  )}
                </span>
              </div>

              {quoteError && (
                <p className="text-status-cancelled-fg text-xs">{quoteError}</p>
              )}

              {/*
                Past the tapered table the delivery fee stops covering the
                vehicle, so the order is quoted by hand instead of being sold
                below cost. The flag was computed and returned all along.
              */}
              {quote?.requiresIndividualQuote && (
                <div className="border-status-pending-fg/25 bg-status-pending text-status-pending-fg mt-1 rounded-xl border px-3 py-2.5 text-xs">
                  <strong className="font-semibold">
                    This order needs a quote from us.
                  </strong>{" "}
                  It is large enough that our standard delivery rate no longer
                  covers the trip. Place it and we will confirm the delivery
                  cost with you, or message us and we will price it now.
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <SubmitButton
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
          </SubmitButton>
          <p className="text-body text-center text-xs">
            {paymentMethod === "wallet"
              ? "Payment will be deducted from your wallet."
              : "You'll be redirected to Paystack to complete payment securely."}
          </p>
        </div>
      </form>
    </div>
  );
}
