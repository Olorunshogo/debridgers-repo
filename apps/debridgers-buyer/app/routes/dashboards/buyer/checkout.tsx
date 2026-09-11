import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Check, X, ArrowRight, Loader2 } from "lucide-react";
import { apiFetch, publicRequest } from "@debridgers/api-client";
import { useCart } from "../../../features/cart";
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
  extractServerFieldErrors,
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

type Step = "delivery" | "payment" | "confirmed" | "failed" | "awaiting-quote";

interface DeliveryZone {
  id: number;
  name: string;
  delivery_fee: number;
  free_delivery: boolean;
  areas: string[];
  requires_quote: boolean;
}

/*
 * Mirrors the quote endpoint's response - see delivery-fee.ts on the backend.
 *
 * The server is the single, deliberate enforcer of the minimum order: it rejects a below-minimum basket at order time.
 * The client does not read or surface `belowMinimumOrder` here on purpose, so there is one place that decision lives rather than a client copy that can drift from the floor in `@debridgers/pricing`.
 *
 * `serviceFeeKobo` is the cost-to-serve fee; `handlingFeeKobo` is the same value under the name the orders table still uses, so prefer `serviceFeeKobo` in new code.
 * `requiresIndividualQuote` is set when the basket is past the tapered table and the delivery fee no longer covers the vehicle.
 * It was computed and returned all along, and read by nothing, so checkout sold these orders below cost in silence.
 */
interface OrderQuote {
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  deliveryFeeBeforePromoKobo: number;
  serviceFeeKobo: number;
  handlingFeeKobo: number;
  totalKobo: number;
  freeDelivery: boolean;
  extraPackages: number;
  package_count: number;
  requiresIndividualQuote: boolean;
  /* True when deliveryFeeKobo/totalKobo above are unpriced placeholders - see priceBasket on the backend. */
  requires_zone_quote: boolean;
}

/* Long enough that changing zone or quantity a few times is one request. */
const QUOTE_DEBOUNCE_MS = 400;

/* How long the failed screen shows before it sends the buyer back to the shop. */
const FAILED_REDIRECT_SECONDS = 4;

const PROGRESS_STEPS: { label: string }[] = [
  { label: "Cart" },
  { label: "Delivery" },
  { label: "Payment" },
  { label: "Confirmed" },
];

/*
 * Cart is always done the moment this page mounts - a buyer only ever
 * reaches checkout with a cart already built, so it has no real "current"
 * state of its own. "failed" keeps Payment as the active dot rather than
 * adding a fifth one, since retrying re-attempts the same payment.
 */
function progressIndex(step: Step): number {
  if (step === "delivery") return 1;
  if (step === "payment" || step === "failed" || step === "awaiting-quote")
    return 2;
  return 3;
}

function CheckoutProgress({ current }: { current: Step }) {
  const activeIndex = progressIndex(current);
  return (
    <div className="flex items-center gap-2">
      {PROGRESS_STEPS.map((s, i) => {
        const done = i < activeIndex || current === "confirmed";
        const active = i === activeIndex && current !== "confirmed";
        return (
          <div key={s.label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                done
                  ? "bg-primary text-white"
                  : active
                    ? "border-primary text-primary border-2"
                    : "bg-light-bg text-body"
              }`}
            >
              {done ? <Check size={14} /> : i + 1}
            </div>
            <span
              className={`text-sm ${
                done || active ? "text-heading font-medium" : "text-body"
              }`}
            >
              {s.label}
            </span>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className="bg-line h-px w-8" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/*
 * Carton.png already has a badge baked into its artwork (a red circle + X),
 * so this badge is sized and positioned to fully cover it rather than try
 * to mask/crop the source image - both variants paint a fresh, opaque
 * circle over the same spot.
 */
const CARTON_BADGE_POSITION = { left: "50.45%", top: "35.78%" };

function OrderResultIllustration({
  variant,
}: {
  variant: "success" | "failed";
}) {
  const Icon = variant === "success" ? Check : X;
  return (
    <div className="relative h-44 w-44">
      <img
        src="/images/Carton.png"
        alt=""
        className="h-full w-full object-contain"
      />
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 18,
          delay: 0.15,
        }}
        className={`absolute flex items-center justify-center rounded-full ${
          variant === "success" ? "bg-primary" : "bg-error-red"
        }`}
        style={{
          left: CARTON_BADGE_POSITION.left,
          top: CARTON_BADGE_POSITION.top,
          width: "22%",
          height: "22%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Icon className="h-[65%] w-[65%] text-white" strokeWidth={3} />
      </motion.div>
    </div>
  );
}

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
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("delivery");
  /* Shown on the failed screen; distinct from `error`, which stays on the form for pre-flight validation (insufficient balance, etc). */
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [failedCountdown, setFailedCountdown] = useState<number>(
    FAILED_REDIRECT_SECONDS,
  );
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  /* State is fixed to the launch state by default; LGA narrows the zone list. */
  const [stateName, setStateName] = useState<string>(defaultStateName);
  /* Chikun is a real priced zone and the closest thing to a "just checkout" default. */
  const [lga, setLga] = useState<string>("Chikun");
  const [zoneId, setZoneId] = useState<string>("");
  /* The running campaign and the minimum order, from the one place that knows them - both were already fetched by this provider and rendered nowhere. */
  const { deliveryPromotion } = usePlatformConfig();

  const promotionCoversZone = (zone: number): boolean =>
    !!deliveryPromotion && deliveryPromotion.zone_ids.includes(zone);

  // Kept while a new quote is in flight so totals never flash empty.
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoting, setQuoting] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  /* Payment method selection */
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletLoading, setWalletLoading] = useState<boolean>(true);

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
   * Zones that serve the chosen LGA.
   * The seeded zones are named after LGAs ("Kaduna South") and also list their areas, so match on either - the same rule the backend uses to resolve a zone, kept in step deliberately.
   */
  const preciselyMatchedZones = useMemo(() => {
    if (!lga) return [];
    const target = lga.trim().toLowerCase();
    return zones.filter(
      (zone) =>
        !zone.requires_quote &&
        (zone.name.trim().toLowerCase() === target ||
          zone.areas.some((area) => area.trim().toLowerCase() === target)),
    );
  }, [zones, lga]);

  const catchAllZone = useMemo(
    () => zones.find((zone) => zone.requires_quote) ?? null,
    [zones],
  );

  /*
   * Every Kaduna LGA is deliverable now: one that misses a priced zone above
   * falls back to the catch-all, which routes checkout to a manual delivery
   * quote (see zones.requires_quote) instead of blocking the order. The old
   * "LGA must match a priced zone" restriction is still preciselyMatchedZones
   * above - revert this to `return preciselyMatchedZones;` to restore it.
   */
  const zonesForLga = useMemo(() => {
    if (preciselyMatchedZones.length > 0) return preciselyMatchedZones;
    if (lga && stateName === defaultStateName && catchAllZone) {
      return [catchAllZone];
    }
    return preciselyMatchedZones;
  }, [preciselyMatchedZones, lga, stateName, catchAllZone]);

  const zoneRequiresQuote =
    zones.find((zone) => String(zone.id) === zoneId)?.requires_quote ?? false;

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
   * Live quote.
   * The server owns the pricing - delivery is a zone base plus a per-package charge, and a promo can zero it - so the summary asks rather than recomputing it here and risking a number that differs from the charge.
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
          /* Drop the stale quote: showing the previous total next to an error is how a buyer ends up believing a price the server just refused. */
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
   * Return leg from Paystack.
   * Arriving here proves the buyer came back, not that they paid - Paystack sends the same callback when a card is declined or the page is abandoned.
   * So the reference is confirmed with the server before anything is treated as bought, and the cart survives a failure.
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
        clear();
        setStep("confirmed");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPaymentError(
          err instanceof Error
            ? err.message
            : "We could not confirm that payment. Your cart has been kept.",
        );
        setStep("failed");
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

  /* Resets the countdown fresh each time a new failure is shown, then ticks down to the shop. */
  useEffect(() => {
    if (step !== "failed") return;
    setFailedCountdown(FAILED_REDIRECT_SECONDS);

    const interval = window.setInterval(() => {
      setFailedCountdown((n) => n - 1);
    }, 1000);
    const timeout = window.setTimeout(() => {
      navigate("/buyer-dashboard/shop");
    }, FAILED_REDIRECT_SECONDS * 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [step, navigate]);

  async function handleContinue(e: React.SyntheticEvent) {
    e.preventDefault();
    if (cartItems.length === 0 || !deliveryAddress.trim() || !zoneId) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      if (zoneRequiresQuote) {
        /*
         * No payment attempted - the order is created and left pending a
         * manual delivery fee (see BuyerService.createOrder's
         * requiresZoneQuote branch). The buyer pays later, from their
         * orders list, once /buyer/orders/:id/pay is unblocked.
         */
        await apiFetch("/buyer/orders", {
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

        clear();
        setStep("awaiting-quote");
        stopSubmitting();
        return;
      }

      if (paymentMethod === "wallet") {
        /*
         * Balance is checked before the order exists, not after.
         *
         * Creating first and bailing on a shortfall left a pending, unpayable order behind on every failed attempt.
         * The quote is the same figure the server will charge, so it is enough to decide this up front.
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
         * Re-checked against the server's own total.
         * The pre-flight check used the quote; this catches the case where the two disagree, and cancels the order rather than leaving it pending and unpayable.
         */
        if (wallet.wallet.available_balance < amount) {
          await apiFetch(`/buyer/orders/${orderId}/cancel`, {
            method: "POST",
            body: JSON.stringify({ reason: "Insufficient wallet balance" }),
          }).catch(() => {
            /*
             * Best effort.
             * An uncancelled order is recoverable; a misleading success message is not.
             */
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
        setStep("payment");
        const paymentPayload = {
          payment_method: "wallet",
          amount_kobo: amount,
        };
        /*
         * Its own try/catch: by this point the order exists and this is a
         * genuine payment attempt, not a validation step, so a failure here
         * goes to the animated failed screen rather than back to the form.
         */
        try {
          await apiFetch(`/buyer/orders/${orderId}/pay`, {
            method: "POST",
            body: JSON.stringify(paymentPayload),
          });
        } catch (payErr) {
          setPaymentError(
            payErr instanceof Error
              ? payErr.message
              : "Wallet payment failed. Your cart has been kept.",
          );
          setStep("failed");
          stopSubmitting();
          return;
        }

        clear();
        setStep("confirmed");
      } else {
        // Card payment: initialize Paystack
        setStep("payment");
        /* `totals` carries the same figures as the quote, minus package_count. */
        const res = await apiFetch<{
          authorization_url: string;
          reference: string;
          order_id: number;
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
      /*
       * Reached only from order creation / payment initialization, before
       * any real payment was attempted - a fixable form problem, not a
       * declined payment, so back to the form rather than the failed screen.
       */
      setStep("delivery");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process payment. Please try again.",
      );
      setFieldErrors(extractServerFieldErrors(err));
      stopSubmitting();
    }
  }

  /* Hides the form while the return leg settles, so the buyer cannot pay twice. */
  if (confirming) {
    return (
      <div className="flex max-w-250 flex-col gap-6">
        <CheckoutProgress current="payment" />
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Loader2 size={40} className="text-primary animate-spin" />
          <h2 className="font-syne text-heading text-xl font-bold">
            Confirming your payment
          </h2>
          <p className="text-body max-w-87.5 text-sm">
            This only takes a moment. Please do not close this page.
          </p>
        </div>
      </div>
    );
  }

  if (step === "confirmed") {
    return (
      <div className="flex max-w-250 flex-col gap-6">
        <CheckoutProgress current="confirmed" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 py-16 text-center"
        >
          <OrderResultIllustration variant="success" />
          <h2 className="font-syne text-heading text-2xl font-bold">
            Yay! Your order is in!
          </h2>
          <p className="text-body max-w-87.5 text-sm">
            We&apos;ve received your order and we&apos;re getting your goodies
            ready.
          </p>
          <Link
            to="/buyer-dashboard/orders"
            className="bg-primary flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Track your order <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    );
  }

  if (step === "awaiting-quote") {
    return (
      <div className="flex max-w-250 flex-col gap-6">
        <CheckoutProgress current="awaiting-quote" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 py-16 text-center"
        >
          <OrderResultIllustration variant="success" />
          <h2 className="font-syne text-heading text-2xl font-bold">
            Order received!
          </h2>
          <p className="text-body max-w-87.5 text-sm">
            Your delivery area is outside our priced zones, so we&apos;re
            confirming a delivery fee by hand. We&apos;ll notify you here as
            soon as it&apos;s ready so you can pay.
          </p>
          <Link
            to="/buyer-dashboard/orders"
            className="bg-primary flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            View my orders <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="flex max-w-250 flex-col gap-6">
        <CheckoutProgress current="failed" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 py-16 text-center"
        >
          <OrderResultIllustration variant="failed" />
          <h2 className="font-syne text-heading text-2xl font-bold">
            Payment failed
          </h2>
          <p className="text-body max-w-87.5 text-sm">
            {paymentError ?? "Something went wrong. Your cart has been kept."}
          </p>
          <p className="text-body text-xs">
            Taking you back to the shop in {failedCountdown}s...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex max-w-250 flex-col gap-6">
      <CheckoutProgress current={step} />

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
              error={fieldErrors.zoneId}
              placeholder={
                !lga
                  ? "Choose an LGA first"
                  : zonesForLga.length === 0
                    ? "We do not deliver here yet"
                    : "Choose your area"
              }
              disabled={!lga || zonesForLga.length === 0}
              /*
               * A running campaign is reflected here, not only once a quote returns.
               * The picker used to read zone.free_delivery alone, so a global campaign was invisible at the moment of choosing.
               */
              options={zonesForLga.map((zone) => ({
                value: String(zone.id),
                label: zone.requires_quote
                  ? `${zone.name} - fee confirmed after ordering`
                  : zone.free_delivery || promotionCoversZone(zone.id)
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

            {zonesForLga.length === 1 && zonesForLga[0].requires_quote && (
              <p className="text-body text-xs">
                {lga} is outside our priced delivery areas. We&apos;ll confirm a
                delivery fee after you place this order and notify you here to
                complete payment.
              </p>
            )}
            <TextareaField
              label="Full delivery address"
              required
              aria-required="true"
              value={deliveryAddress}
              error={fieldErrors.deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter your full delivery address..."
              rows={3}
            />
          </div>

          {/*
            No payment method to choose when delivery is unpriced - nothing
            can be charged yet, so this order is placed, not paid, and the
            buyer picks a method later once /pay is unblocked by a quote.
          */}
          {!zoneRequiresQuote && (
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
          )}

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
                Delivery is priced server-side and only known once an area is chosen.
                Saying "Free" before then, as this used to, was simply wrong once per-package pricing landed.
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
                  Four distinct states, not three.
                  This used to render a bare "..." for everything that was not a finished quote, so a failed one sat there for ever while the reason appeared in small red text underneath.
                */}
                {!zoneId ? (
                  <span className="text-placeholder-text">Choose an area</span>
                ) : quoteError ? (
                  <span className="text-status-cancelled-fg">Unavailable</span>
                ) : quoting || !quote ? (
                  <span className="text-placeholder-text">Calculating…</span>
                ) : quote.requires_zone_quote ? (
                  <span className="text-status-pending-fg font-medium">
                    To be confirmed
                  </span>
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
                Named for what it pays for.
                It was "Handling", which is why it was once set at 100 naira: it is not a charge for lifting a bag, it covers the payment rail and the admin around the order.
              */}
              {quote && (
                <div className="text-body flex justify-between text-sm">
                  <span>Service fee</span>
                  <span>{formatFromKobo(quote.serviceFeeKobo)}</span>
                </div>
              )}

              <div className="font-syne text-heading flex justify-between text-lg font-bold">
                <span>
                  Total
                  {quote?.requires_zone_quote && (
                    <span className="text-body block text-xs font-normal">
                      excl. delivery, confirmed after ordering
                    </span>
                  )}
                </span>
                {/*
                  No subtotal fallback.
                  Falling back to the items total showed a figure that excluded delivery and the service fee, so a buyer whose quote had failed was shown less than they would be charged.
                  Better to show nothing than a number that is wrong.
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

              {quote?.requires_zone_quote && (
                <div className="border-status-pending-fg/25 bg-status-pending text-status-pending-fg mt-1 rounded-xl border px-3 py-2.5 text-xs">
                  <strong className="font-semibold">
                    Delivery fee confirmed after ordering.
                  </strong>{" "}
                  {lga} is outside our priced delivery zones. Place this order
                  and we&apos;ll confirm a delivery fee by hand, then notify you
                  here to complete payment - no charge happens now.
                </div>
              )}

              {/*
                Past the tapered table the delivery fee stops covering the vehicle, so the order is quoted by hand instead of being sold below cost.
                The flag was computed and returned all along.
              */}
              {quote?.requiresIndividualQuote &&
                !quote?.requires_zone_quote && (
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
            loadingText={
              zoneRequiresQuote
                ? "Placing order..."
                : `Processing ${paymentMethod === "wallet" ? "wallet" : "card"} payment...`
            }
            disabled={
              cartItems.length === 0 ||
              !deliveryAddress.trim() ||
              !zoneId ||
              (!zoneRequiresQuote &&
                paymentMethod === "wallet" &&
                walletLoading)
            }
            className="flex"
          >
            {zoneRequiresQuote
              ? "Place order"
              : paymentMethod === "wallet"
                ? "Pay with Wallet"
                : "Pay with Card"}
            <ArrowRight size={16} />
          </SubmitButton>
          <p className="text-body text-center text-xs">
            {zoneRequiresQuote
              ? "No charge yet - we'll confirm your delivery fee first."
              : paymentMethod === "wallet"
                ? "Payment will be deducted from your wallet."
                : "You'll be redirected to Paystack to complete payment securely."}
          </p>
        </div>
      </form>
    </div>
  );
}
