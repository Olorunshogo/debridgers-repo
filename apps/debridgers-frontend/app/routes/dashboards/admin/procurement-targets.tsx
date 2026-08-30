import { useMemo, useState } from "react";
import { ComingSoon } from "@debridgers/ui-web";
import { Calculator, Landmark } from "lucide-react";
import {
  buyPriceForMargin,
  computeOrder,
  sellPriceForMargin,
  type OrderBreakdown,
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
 * The calculator is live and works today; it is arithmetic, not a feature
 * waiting on a backend. What is still a proposal is everything needing data the
 * company does not yet record: last price paid per supplier, achieved spread
 * over time, and an alert when a purchase breaches the walk-away price.
 *
 * Derivation in docs/business/BusinessModel.md.
 */

export function meta() {
  return [
    { title: "Procurement Targets | Admin" },
    {
      name: "description",
      content: "Buy-price and sell-price targets for supply and farmer admins.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// === Types

type Direction = "fromMarket" | "fromFarmer";

// === Helpers

const naira = (n: number): string =>
  `₦${Math.round(n).toLocaleString("en-NG")}`;

const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;

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

// === Page

export default function ProcurementTargets() {
  const { pricing, isLoading, error } = usePlatformConfig();
  const [direction, setDirection] = useState<Direction>("fromMarket");
  const [marketPrice, setMarketPrice] = useState<number>(98000);
  const [farmerPrice, setFarmerPrice] = useState<number>(90000);
  const [targetMargin, setTargetMargin] = useState<number>(10);
  const [packages, setPackages] = useState<number>(1);
  const [zoneBase, setZoneBase] = useState<number>(4000);
  const [dropsPerTrip, setDropsPerTrip] = useState<number>(1);
  const [loadingPerPackage, setLoadingPerPackage] = useState<number>(300);
  const [inboundHaulage, setInboundHaulage] = useState<number>(0);

  const shared = useMemo(
    () => ({
      packages,
      zoneBase,
      dropsPerTrip,
      loadingPerPackage,
      inboundHaulage,
    }),
    [packages, zoneBase, dropsPerTrip, loadingPerPackage, inboundHaulage],
  );

  const margin: number = targetMargin / 100;

  /*
   * The fee rules come from the API, never from a local copy, so this page
   * cannot quote against a fee structure the buyer is not billed under.
   */
  const rules: PricingRules | null = pricing;

  /* One price is given; the other is solved for the target margin. */
  const solvedBuy: number = useMemo(
    () =>
      rules
        ? buyPriceForMargin(
            { ...shared, sellPrice: marketPrice },
            margin,
            rules,
          )
        : 0,
    [shared, marketPrice, margin, rules],
  );

  const solvedSell: number = useMemo(
    () =>
      rules
        ? sellPriceForMargin(
            { ...shared, buyPrice: farmerPrice },
            margin,
            rules,
          )
        : 0,
    [shared, farmerPrice, margin, rules],
  );

  const sellPrice: number =
    direction === "fromMarket" ? marketPrice : solvedSell;
  const buyPrice: number = direction === "fromMarket" ? solvedBuy : farmerPrice;

  const order: OrderBreakdown | null = useMemo(
    () =>
      rules ? computeOrder({ ...shared, sellPrice, buyPrice }, rules) : null,
    [shared, sellPrice, buyPrice, rules],
  );

  const walkAway: number = useMemo(
    () => (rules ? buyPriceForMargin({ ...shared, sellPrice }, 0, rules) : 0),
    [shared, sellPrice, rules],
  );

  /*
   * Deliberately refuses to render numbers rather than falling back to a local
   * copy of the fee rules. A buying desk quoting against invented fees is worse
   * than a buying desk that has to wait for a page load.
   */
  if (isLoading || !rules || !order) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <section className="border-line rounded-2xl border bg-white p-6 sm:p-8">
          <h1 className="font-syne text-heading mb-2 text-xl font-semibold">
            Procurement Targets
          </h1>
          <p className="text-body text-sm">
            {error ?? "Loading the live fee rules from the server."}
          </p>
          {error ? (
            <p className="text-body/70 mt-2 text-xs">
              Targets are not shown without them: quoting a farmer against a fee
              structure the buyer is not billed under is how a price gets agreed
              that cannot be honoured.
            </p>
          ) : null}
        </section>
      </div>
    );
  }

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
              value={marketPrice}
              onChange={setMarketPrice}
              note="What the buyer would pay at market"
            />
          ) : (
            <NumberField
              label="Farmer price, per package"
              suffix="₦"
              value={farmerPrice}
              onChange={setFarmerPrice}
              note="What we pay, before haulage"
            />
          )}
          <NumberField
            label="Target margin"
            suffix="% of order"
            value={targetMargin}
            step={1}
            onChange={setTargetMargin}
          />
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
          <NumberField
            label="Zone base"
            suffix="₦"
            value={zoneBase}
            onChange={setZoneBase}
            note="South 4,000 / North 4,500 / Chikun 6,000"
          />
          <NumberField
            label="Loading, per package"
            suffix="₦"
            value={loadingPerPackage}
            step={100}
            onChange={setLoadingPerPackage}
            note="300 for 50kg, 500 for 100kg"
          />
          <NumberField
            label="Inbound haulage, per package"
            suffix="₦"
            value={inboundHaulage}
            step={250}
            onChange={setInboundHaulage}
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
              {naira(direction === "fromMarket" ? solvedBuy : solvedSell)}
            </p>
            <p className="text-body mt-1 text-sm">
              {direction === "fromMarket"
                ? `${pct(order.procurementSpread)} below the ${naira(marketPrice)} market price`
                : `${pct((solvedSell - farmerPrice) / farmerPrice)} above the ${naira(farmerPrice)} farmer price`}
            </p>

            <div className="border-line mt-4 border-t pt-3">
              <Row
                label="Walk-away price"
                note="Pay above this and the order loses money"
                value={naira(walkAway)}
                tone={walkAway >= sellPrice ? "result" : "cost"}
              />
              {walkAway >= sellPrice ? (
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
              value={naira(order.itemsTotal)}
            />
            <Row
              label="Delivery fee charged"
              value={naira(order.deliveryFee)}
            />
            <Row
              label="Cost-to-serve fee charged"
              note={`${(rules.serviceFeeRate * 100).toFixed(1)}%, floor ${naira(rules.serviceFeeMin)}, cap ${naira(rules.serviceFeeMax)}`}
              value={naira(order.serviceFee)}
            />
            <Row label="Buyer pays" value={naira(order.revenue)} tone="total" />

            <div className="mt-3" />
            <Row
              label="Landed cost of goods"
              note="Farmer price plus inbound haulage"
              value={`(${naira(order.landedGoods)})`}
              tone="cost"
            />
            <Row
              label="Paystack, local card"
              note="1.5% + ₦100, capped ₦2,000"
              value={`(${naira(order.paystack)})`}
              tone="cost"
            />
            <Row
              label="Delivery vehicle"
              note={
                dropsPerTrip > 1
                  ? `${naira(zoneBase)} split across ${dropsPerTrip} drops`
                  : "Dedicated trip"
              }
              value={`(${naira(order.vehicle)})`}
              tone="cost"
            />
            <Row
              label="Loading and offloading"
              value={`(${naira(order.loading)})`}
              tone="cost"
            />
            <Row
              label="Total cost"
              value={`(${naira(order.totalCost)})`}
              tone="total"
            />

            <div className="border-line mt-3 border-t pt-3">
              <Row
                label="Contribution"
                note={`${pct(order.marginOnRevenue)} of what the buyer paid`}
                value={naira(order.contribution)}
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
            relationship owner, and the last three prices paid with dates.
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
          <li>
            <strong>Zone bases served from the API.</strong> The fee rules now
            come from <code>GET /config/public</code>, but the zone base is
            still typed in by hand. It should be picked from the live zone list.
          </li>
        </ul>
      </ComingSoon>
    </div>
  );
}
