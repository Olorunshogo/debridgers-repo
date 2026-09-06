import { useEffect, useMemo, useState } from "react";
import { ComingSoon } from "@debridgers/ui-web";
import { Calculator, Landmark } from "lucide-react";
import { apiFetch, publicRequest } from "@debridgers/api-client";
import {
  procurementTargets,
  LOADING_50KG_KOBO,
  LOADING_100KG_KOBO,
  type ProcurementTargets,
  type ProcurementTargetsInput,
  type PricingRules,
} from "@debridgers/pricing";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext";

/*
 * Procurement Targets: the buying desk's screen.
 *
 * Debridgers sells at the market reference price and takes no markup, so every
 * naira of profit is the gap between that price and what we actually paid.
 * Nothing else in the product tells the person doing the buying what that gap
 * has to be, which means prices get agreed against a feeling about whether they
 * leave room.
 *
 * The desk states two things, the cost and the target margin, and one call to
 * `procurementTargets` derives the rest. It used to solve each output through a
 * separate call that assembled its own arguments, which is how two figures on
 * one screen came to be computed against different assumptions.
 *
 * Derivation in docs/business/BusinessModel.md.
 */

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Procurement Targets | Admin",
    description:
      "Buy-price and sell-price targets for supply and farmer admins.",
    path: "/procurement-targets",
    noIndex: true,
  });
}

// === Types

type Direction = "fromMarket" | "fromFarmer";

type PackageSize = "50kg" | "100kg";

/* What GET /zones serves. The taper and the ceiling are the zone's own. */
interface DeliveryZone {
  id: number;
  name: string;
  delivery_fee: number;
  free_delivery: boolean;
  areas: string[];
  tier_one_per_package_kobo: number;
  tier_two_per_package_kobo: number;
  delivery_cap_kobo: number;
}

// === Helpers

const naira = (kobo: number): string =>
  `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;

const pct = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`;

/* The only place a typed naira figure becomes the kobo everything else uses. */
const toKobo = (nairaAmount: number): number =>
  Math.round((Number.isFinite(nairaAmount) ? nairaAmount : 0) * 100);

const LOADING_PER_PACKAGE_KOBO: Record<PackageSize, number> = {
  "50kg": LOADING_50KG_KOBO.value,
  "100kg": LOADING_100KG_KOBO.value,
};

// === Presentation

function Row({
  label,
  value,
  note,
  tone = "plain",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "plain" | "cost" | "total" | "result";
}) {
  const valueClass: string =
    tone === "cost"
      ? "text-red-600"
      : tone === "result"
        ? "text-status-delivered-fg font-semibold"
        : tone === "total"
          ? "text-heading font-semibold"
          : "text-heading";

  return (
    <div className="border-line flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-body text-sm">
        {label}
        {note ? (
          <span className="text-body/60 block text-xs">{note}</span>
        ) : null}
      </span>
      <span className={`shrink-0 text-sm tabular-nums ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 500,
  note,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
  note?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-body text-xs font-medium">
        {label}
        {suffix ? <span className="text-body/60"> ({suffix})</span> : null}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border-line text-heading rounded-xl border bg-white px-3 py-2 text-sm tabular-nums"
      />
      {note ? <span className="text-body/60 text-xs">{note}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  note,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-body text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-line text-heading cursor-pointer rounded-xl border bg-white px-3 py-2 text-sm"
      >
        {children}
      </select>
      {note ? <span className="text-body/60 text-xs">{note}</span> : null}
    </label>
  );
}

// === Page

export default function ProcurementTargets() {
  const { pricing, isLoading, error } = usePlatformConfig();

  const [direction, setDirection] = useState<Direction>("fromMarket");
  const [marketPriceNaira, setMarketPriceNaira] = useState<number>(98000);
  const [farmerPriceNaira, setFarmerPriceNaira] = useState<number>(90000);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(10);
  /*
   * The margin persisted in system_settings, once loaded. The field above stays
   * freely editable for what-if runs; only "Save as default" writes it back, and
   * the button only appears while the two disagree.
   */
  const [persistedMarginPercent, setPersistedMarginPercent] = useState<
    number | null
  >(null);
  const [marginSaving, setMarginSaving] = useState<boolean>(false);
  const [marginSaveError, setMarginSaveError] = useState<string | null>(null);
  const [packages, setPackages] = useState<number>(1);
  const [dropsPerTrip, setDropsPerTrip] = useState<number>(1);
  const [packageSize, setPackageSize] = useState<PackageSize>("50kg");
  const [inboundHaulageNaira, setInboundHaulageNaira] = useState<number>(0);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [zonesLoading, setZonesLoading] = useState<boolean>(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  // === Zones
  useEffect(() => {
    let cancelled: boolean = false;

    publicRequest<DeliveryZone[]>("/zones")
      .then((rows) => {
        if (cancelled) return;
        setZones(rows);
        setZoneId(rows[0]?.id ?? null);
        setZonesError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setZonesError("Could not load the delivery zones.");
      })
      .finally(() => {
        if (!cancelled) setZonesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // === Persisted target margin
  useEffect(() => {
    let cancelled: boolean = false;

    apiFetch<{ procurement_target_margin_percent: number }>("/admin/settings")
      .then((data) => {
        if (cancelled) return;
        const stored: number = data.procurement_target_margin_percent;
        if (!Number.isFinite(stored)) return;
        setPersistedMarginPercent(stored);
        setTargetMarginPercent(stored);
      })
      .catch(() => {
        /* A missing setting is not fatal here: the field keeps its default and
           the "Save as default" affordance simply never shows. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveMarginDefault(): Promise<void> {
    setMarginSaving(true);
    setMarginSaveError(null);
    try {
      await apiFetch("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          key: "procurement_target_margin_percent",
          value: String(targetMarginPercent),
        }),
      });
      setPersistedMarginPercent(targetMarginPercent);
    } catch (err) {
      setMarginSaveError(
        err instanceof Error ? err.message : "Could not save the default.",
      );
    } finally {
      setMarginSaving(false);
    }
  }

  const zone: DeliveryZone | null = useMemo<DeliveryZone | null>(
    () => zones.find((z) => z.id === zoneId) ?? null,
    [zones, zoneId],
  );

  /*
   * The fee rules come from the API, never from a local copy, so this page
   * cannot quote against a fee structure the buyer is not billed under.
   */
  const rules: PricingRules | null = pricing;

  /* One call. Every figure on the screen is read off its result. */
  const targets = useMemo<ProcurementTargets | null>(() => {
    if (!rules || !zone) return null;

    const context = {
      packages,
      zoneBaseKobo: zone.delivery_fee,
      dropsPerTrip,
      loadingPerPackageKobo: LOADING_PER_PACKAGE_KOBO[packageSize],
      inboundHaulageKobo: toKobo(inboundHaulageNaira),
      tierOnePerPackageKobo: zone.tier_one_per_package_kobo,
      tierTwoPerPackageKobo: zone.tier_two_per_package_kobo,
      deliveryCapKobo: zone.delivery_cap_kobo,
      targetMarginPercent,
    };

    const input: ProcurementTargetsInput =
      direction === "fromMarket"
        ? {
            ...context,
            known: "marketPrice",
            marketPriceKobo: toKobo(marketPriceNaira),
          }
        : {
            ...context,
            known: "farmerPrice",
            farmerPriceKobo: toKobo(farmerPriceNaira),
          };

    return procurementTargets(input, rules);
  }, [
    rules,
    zone,
    packages,
    dropsPerTrip,
    packageSize,
    inboundHaulageNaira,
    targetMarginPercent,
    direction,
    marketPriceNaira,
    farmerPriceNaira,
  ]);

  /*
   * A finished request that returned no zones is its own state, not a slow one.
   * Without this branch `!zone` below keeps the loading copy on screen forever
   * once an empty `/zones` response comes back.
   */
  const zonesLoadedEmpty: boolean =
    !isLoading && !zonesLoading && !error && !zonesError && zones.length === 0;

  if (zonesLoadedEmpty) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <section className="border-line rounded-2xl border bg-white p-6 sm:p-8">
          <h1 className="font-syne text-heading mb-2 text-xl font-semibold">
            Procurement Targets
          </h1>
          <p className="text-body text-sm">
            No delivery zones are configured yet. Add one on the Pricing and
            Delivery screen, then the buying desk can quote against its rates.
          </p>
        </section>
      </div>
    );
  }

  /*
   * Deliberately refuses to render numbers rather than falling back to a local
   * copy of the fee rules or a typed zone base. A buying desk quoting against
   * invented fees is worse than a buying desk that has to wait for a page load.
   */
  if (isLoading || zonesLoading || !rules || !zone || !targets) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <section className="border-line rounded-2xl border bg-white p-6 sm:p-8">
          <h1 className="font-syne text-heading mb-2 text-xl font-semibold">
            Procurement Targets
          </h1>
          <p className="text-body text-sm">
            {error ??
              zonesError ??
              "Loading the live fee rules and delivery zones from the server."}
          </p>
          {(error ?? zonesError) ? (
            <p className="text-body/70 mt-2 text-xs">
              Targets are not shown without them: quoting a farmer against a fee
              structure the buyer is not billed under, or against a zone&rsquo;s
              rates read off some other zone, is how a price gets agreed that
              cannot be honoured.
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const feesCarryTheOrder: boolean =
    targets.walkAwayPriceKobo >= targets.sellPriceKobo;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <section className="border-line flex flex-col gap-5 rounded-2xl border bg-white p-6 sm:p-8">
        <header className="flex flex-col gap-1.5">
          <span className="text-primary flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
            <Calculator size={14} />
            Buying desk
          </span>
          <h1 className="font-syne text-heading text-xl font-semibold sm:text-2xl">
            Procurement Targets
          </h1>
          <p className="text-body text-sm">
            What supply has to buy each product for, so that selling it at the
            market price still hits the margin.
          </p>
        </header>

        <div className="border-line flex w-fit gap-1 rounded-full border p-1">
          <button
            type="button"
            onClick={() => setDirection("fromMarket")}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              direction === "fromMarket"
                ? "bg-primary text-white"
                : "text-body hover:opacity-70"
            }`}
          >
            I know the market price
          </button>
          <button
            type="button"
            onClick={() => setDirection("fromFarmer")}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              direction === "fromFarmer"
                ? "bg-primary text-white"
                : "text-body hover:opacity-70"
            }`}
          >
            I know the farmer price
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {direction === "fromMarket" ? (
            <NumberField
              label="Market price, per package"
              suffix="₦"
              value={marketPriceNaira}
              onChange={setMarketPriceNaira}
              note="What the buyer would pay at market"
            />
          ) : (
            <NumberField
              label="Farmer price, per package"
              suffix="₦"
              value={farmerPriceNaira}
              onChange={setFarmerPriceNaira}
              note="What we pay, before haulage"
            />
          )}
          <div className="flex flex-col gap-1">
            <NumberField
              label="Target margin"
              suffix="% of order"
              value={targetMarginPercent}
              step={1}
              onChange={setTargetMarginPercent}
            />
            {persistedMarginPercent !== null &&
            targetMarginPercent !== persistedMarginPercent ? (
              <button
                type="button"
                onClick={() => void saveMarginDefault()}
                disabled={marginSaving}
                className="text-primary self-start text-xs font-semibold hover:opacity-70 disabled:opacity-50"
              >
                {marginSaving
                  ? "Saving..."
                  : `Save ${targetMarginPercent}% as the default`}
              </button>
            ) : null}
            {marginSaveError ? (
              <span className="text-status-cancelled-fg text-xs">
                {marginSaveError}
              </span>
            ) : null}
          </div>
          <NumberField
            label="Packages in the order"
            value={packages}
            step={1}
            onChange={setPackages}
          />
          <NumberField
            label="Deliveries per trip"
            value={dropsPerTrip}
            step={1}
            onChange={setDropsPerTrip}
            note="The trip cost splits across these"
          />
          <SelectField
            label="Delivery zone"
            value={String(zoneId ?? "")}
            onChange={(v) => setZoneId(Number(v))}
            note={`Base ${naira(zone.delivery_fee)}, taper ${naira(
              zone.tier_one_per_package_kobo,
            )} then ${naira(zone.tier_two_per_package_kobo)}, cap ${naira(
              zone.delivery_cap_kobo,
            )}`}
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Package size"
            value={packageSize}
            onChange={(v) => setPackageSize(v as PackageSize)}
            note={`Loading ${naira(LOADING_PER_PACKAGE_KOBO[packageSize])} per package`}
          >
            <option value="50kg">50kg, a one-person lift</option>
            <option value="100kg">100kg, a two-person lift</option>
          </SelectField>
          <NumberField
            label="Inbound haulage, per package"
            suffix="₦"
            value={inboundHaulageNaira}
            step={250}
            onChange={setInboundHaulageNaira}
            note="Supplier to warehouse. Unmeasured"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="border-line rounded-xl border p-4">
            <h2 className="font-syne text-heading mb-3 text-base font-semibold">
              {direction === "fromMarket"
                ? "Buy at or below"
                : "Sell at or above"}
            </h2>
            <p className="text-status-delivered-fg font-syne text-3xl font-semibold tabular-nums">
              {naira(targets.solvedPriceKobo)}
            </p>
            <p className="text-body mt-1 text-sm">
              {direction === "fromMarket"
                ? `${pct(targets.procurementSpread)} below the ${naira(
                    targets.sellPriceKobo,
                  )} market price`
                : `${pct(
                    targets.buyPriceKobo > 0
                      ? (targets.sellPriceKobo - targets.buyPriceKobo) /
                          targets.buyPriceKobo
                      : 0,
                  )} above the ${naira(targets.buyPriceKobo)} farmer price`}
            </p>

            <div className="border-line mt-4 border-t pt-3">
              <Row
                label="Walk-away price"
                note="Pay above this and the order loses money"
                value={naira(targets.walkAwayPriceKobo)}
                tone={feesCarryTheOrder ? "result" : "cost"}
              />
              <Row
                label="Modelled landed cost"
                note={targets.landedCost.basis}
                value={naira(targets.landedCost.value)}
                tone={
                  targets.landedCost.status === "measured" ? "result" : "plain"
                }
              />
              {direction === "fromFarmer" ? (
                <button
                  type="button"
                  onClick={() =>
                    setFarmerPriceNaira(
                      Math.round(targets.landedCost.value / 100),
                    )
                  }
                  className="text-primary mt-2 cursor-pointer text-xs font-semibold hover:opacity-70"
                >
                  Use the modelled landed cost as the farmer price
                </button>
              ) : null}
              {feesCarryTheOrder ? (
                <p className="text-body/70 mt-2 text-xs">
                  Above the sell price, so the fees alone carry the order: it
                  clears even paying full market price for the goods.
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-line rounded-xl border p-4">
            <h2 className="font-syne text-heading mb-2 text-base font-semibold">
              The full order, line by line
            </h2>
            <Row
              label="Goods, what the buyer pays"
              value={naira(targets.itemsTotalKobo)}
            />
            <Row
              label="Delivery fee charged"
              note={`${zone.name}, ${packages} package${packages === 1 ? "" : "s"}`}
              value={naira(targets.deliveryFeeKobo)}
            />
            <Row
              label="Cost-to-serve fee charged"
              note={`${(rules.serviceFeeRate * 100).toFixed(1)}%, floor ${naira(
                toKobo(rules.serviceFeeMin),
              )}, cap ${naira(toKobo(rules.serviceFeeMax))}`}
              value={naira(targets.serviceFeeKobo)}
            />
            <Row
              label="Buyer pays"
              value={naira(targets.revenueKobo)}
              tone="total"
            />

            <div className="mt-3" />
            <Row
              label="Landed cost of goods"
              note="Farmer price plus inbound haulage"
              value={`(${naira(targets.landedGoodsKobo)})`}
              tone="cost"
            />
            <Row
              label="Paystack, local card"
              note="1.5% + ₦100, capped ₦2,000"
              value={`(${naira(targets.paystackKobo)})`}
              tone="cost"
            />
            <Row
              label="Delivery vehicle"
              note={
                dropsPerTrip > 1
                  ? `${naira(zone.delivery_fee)} split across ${dropsPerTrip} drops`
                  : "Dedicated trip"
              }
              value={`(${naira(targets.vehicleKobo)})`}
              tone="cost"
            />
            <Row
              label="Loading and offloading"
              value={`(${naira(targets.loadingKobo)})`}
              tone="cost"
            />
            <Row
              label="Total cost"
              value={`(${naira(targets.totalCostKobo)})`}
              tone="total"
            />

            <div className="border-line mt-3 border-t pt-3">
              <Row
                label="Contribution"
                note={`${pct(targets.marginOnRevenue)} of what the buyer paid`}
                value={naira(targets.contributionKobo)}
                tone="result"
              />
            </div>
          </div>
        </div>

        <div className="border-line rounded-xl border p-4">
          <h3 className="font-syne text-heading mb-2 flex items-center gap-2 text-sm font-semibold">
            <Landmark size={16} className="shrink-0" />
            Reading this
          </h3>
          <ul className="text-body list-disc space-y-1.5 pl-5 text-sm">
            <li>
              <strong>
                Deliveries per trip is the strongest input on this page.
              </strong>{" "}
              The vehicle is a trip cost, not an order cost, so batching three
              drops into one run divides it by three. On a single bag that is
              worth more than a good day of negotiating.
            </li>
            <li>
              <strong>
                Inbound haulage defaults to zero because nobody has measured it.
              </strong>{" "}
              Set it to what a bag actually costs to move from the supplier to
              the warehouse. At ₦2,000 the target buy price drops by ₦2,000 and
              several products stop clearing on fees alone.
            </li>
            <li>
              <strong>The zone sets its own delivery rates.</strong> The base,
              the taper and the ceiling all come from the zone row the checkout
              charges against, so a far zone is never quoted at a near
              zone&rsquo;s schedule.
            </li>
            <li>
              <strong>
                Margin here is contribution over what the buyer paid
              </strong>
              , not markup over cost. It is the figure that has to cover the
              warehouse, the salaries, and everything else that is not a single
              order.
            </li>
            <li>
              A walk-away price <em>above</em> the sell price is the fee
              structure doing its job: delivery and cost-to-serve cover the
              operation, so procurement spread becomes profit rather than
              survival.
            </li>
          </ul>
        </div>
      </section>

      <ComingSoon
        commented={false}
        variant="page"
        title="What this page still needs"
        description="The calculator above is live. Comparing it against what we actually pay is not."
      >
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>A supplier register.</strong> Name, location, products,
            capacity per cycle, lead time, quality outcome, payment terms,
            relationship owner, and the last three prices paid with dates. It is
            what turns the modelled landed cost above into a measured one.
          </li>
          <li>
            <strong>Inbound haulage recorded per purchase</strong>, so landed
            cost stops being a number somebody types in from memory.
          </li>
          <li>
            <strong>Last paid, shown beside each target</strong>, per supplier
            and dated, so a rising farm-gate price is visible before it reaches
            the accounts.
          </li>
          <li>
            <strong>
              An alert when a purchase breaches the walk-away price
            </strong>
            , at the moment it is recorded rather than at month end.
          </li>
          <li>
            <strong>Achieved spread over the last 30 days</strong>, per product.
            The only honest answer to whether the 6% assumption under every
            projection in the business model is real.
          </li>
        </ul>
      </ComingSoon>
    </div>
  );
}
