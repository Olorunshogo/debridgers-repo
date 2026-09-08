import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Plus,
  Pencil,
  PowerOff,
  X,
  Check,
  Lock,
  Megaphone,
  MapPin,
} from "lucide-react";
import { apiFetch, apiMutate, ApiError } from "@debridgers/api-client";
import {
  AlertBanner,
  TextInputField,
  NumberInputField,
  DateInputField,
  SelectInputField,
  ToggleField,
  SubmitButton,
  extractServerFieldErrors,
  DataTable,
  TablePrimaryCell,
  TableAmountCell,
  TableStatusBadge,
  TableTextCell,
  TableDateCell,
  TableEmptyState,
  fadeDownVariants,
  transitionBase,
  formatFromKobo,
  type RowAction,
  type TableColumn,
} from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Pricing and Delivery | Debridgers Admin",
    description:
      "Correct zone delivery rates, run free-delivery campaigns and review the code-owned fee rules.",
    path: "/pricing",
    noIndex: true,
  });
}

// === Types

/* `delivery_fee` is the base fee covering the first two packages, in kobo. */
interface Zone {
  id: number;
  name: string;
  description: string | null;
  delivery_fee: number;
  areas: string[];
  tier_one_per_package_kobo: number;
  tier_two_per_package_kobo: number;
  delivery_cap_kobo: number;
  free_delivery: boolean;
  is_active: boolean;
}

type PromotionScope = "global" | "zone" | "first_order";

interface Promotion {
  id: number;
  name: string;
  scope: PromotionScope;
  zone_id: number | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  is_running: boolean;
}

interface PromotionCost {
  promotion_id: number;
  name: string;
  orders: number;
  forgone_kobo: number;
}

/*
 * Every figure here is served by the API from `@debridgers/pricing`. None of them is restated in this file, which is the whole point of the panel: it is a window onto the code-owned rules, not a second home for them.
 */
interface FeeRules {
  service_fee_rate: number;
  service_fee_min_kobo: number;
  service_fee_max_kobo: number;
  packages_included_in_base: number;
  tier_one_package_count: number;
  default_tier_one_per_package_kobo: number;
  default_tier_two_per_package_kobo: number;
  default_delivery_cap_over_base_kobo: number;
  minimum_order_kobo: number;
  minimum_order_packages: number;
  individual_quote_package_threshold: number;
  individual_quote_subtotal_kobo: number;
}

/*
 * Money is typed in naira and held as strings, because that is what an input yields and what an operator thinks in. The conversion to kobo happens once, on submit.
 */
interface ZoneForm {
  name: string;
  description: string;
  areas: string;
  delivery_fee: string;
  tier_one: string;
  tier_two: string;
  delivery_cap: string;
  free_delivery: boolean;
  is_active: boolean;
}

interface PromotionForm {
  name: string;
  scope: PromotionScope;
  zone_id: string;
  starts_on: string;
  ends_on: string;
}

// === Constants

const emptyZoneForm: ZoneForm = {
  name: "",
  description: "",
  areas: "",
  delivery_fee: "",
  tier_one: "",
  tier_two: "",
  delivery_cap: "",
  free_delivery: false,
  is_active: true,
};

const emptyPromotionForm: PromotionForm = {
  name: "",
  scope: "global",
  zone_id: "",
  starts_on: "",
  ends_on: "",
};

const scopeOptions: { value: PromotionScope; label: string }[] = [
  { value: "global", label: "Global: every active zone" },
  { value: "zone", label: "Zone: one delivery zone" },
  { value: "first_order", label: "First order: a buyer's first order only" },
];

const scopeLabels: Record<PromotionScope, string> = {
  global: "Global",
  zone: "Zone",
  first_order: "First order",
};

const TAPER_EXPLANATION =
  "Tier two must be strictly below tier one. The cost of a delivery is the trip, not the bag, so the marginal package has to get cheaper. A flat or inverted taper over-charges exactly the large order the business depends on.";

// === Money and date helpers

function koboToNaira(kobo: number): string {
  return String(kobo / 100);
}

/** NaN for a blank or unparseable field, so the caller can reject it. */
function nairaToKobo(naira: string): number {
  const parsed = parseFloat(naira);
  return Number.isNaN(parsed) ? NaN : Math.round(parsed * 100);
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2).replace(/\.00$/, "")}%`;
}

/** YYYY-MM-DD at local midnight. Parsing the bare string would read as UTC. */
function startOfLocalDay(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

/*
 * The campaign window is half open on the server: live from `starts_at` until `ends_at` exclusive.
 * An operator picking an end date means that day is included, so the boundary sent is the following midnight.
 */
function endBoundary(date: string): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function AdminPricingPage() {
  // === Data

  const [zones, setZones] = useState<Zone[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [costs, setCosts] = useState<PromotionCost[]>([]);
  const [feeRules, setFeeRules] = useState<FeeRules | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // === Zone form

  const [showZoneForm, setShowZoneForm] = useState<boolean>(false);
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneForm>(emptyZoneForm);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [savingZone, setSavingZone] = useState<boolean>(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  // === Promotion form

  const [showPromotionForm, setShowPromotionForm] = useState<boolean>(false);
  const [promotionForm, setPromotionForm] =
    useState<PromotionForm>(emptyPromotionForm);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [promotionFieldErrors, setPromotionFieldErrors] = useState<
    Partial<Record<keyof PromotionForm, string>>
  >({});
  const [savingPromotion, setSavingPromotion] = useState<boolean>(false);
  const [endingId, setEndingId] = useState<number | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const [zoneRows, promotionRows, costRows, rules] = await Promise.all([
        apiFetch<Zone[]>("/admin/pricing/zones"),
        apiFetch<Promotion[]>("/admin/pricing/promotions"),
        apiFetch<PromotionCost[]>("/admin/pricing/promotions/cost"),
        apiFetch<FeeRules>("/admin/pricing/fee-rules"),
      ]);
      setZones(zoneRows);
      setPromotions(promotionRows);
      setCosts(costRows);
      setFeeRules(rules);
      setLoadError(null);
    } catch (err) {
      setZones([]);
      setPromotions([]);
      setLoadError(
        errorMessage(
          err,
          "Could not load pricing. Check your connection and retry.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // === Taper

  const tierOneKobo: number = nairaToKobo(zoneForm.tier_one);
  const tierTwoKobo: number = nairaToKobo(zoneForm.tier_two);
  /* Only a pair of real numbers can be judged. A half-typed form is incomplete, not inverted, and must not be scolded for it. */
  const taperInverted: boolean =
    !Number.isNaN(tierOneKobo) &&
    !Number.isNaN(tierTwoKobo) &&
    tierTwoKobo >= tierOneKobo;

  const costByPromotion = useMemo<Map<number, PromotionCost>>(
    () => new Map(costs.map((row) => [row.promotion_id, row])),
    [costs],
  );

  const zoneNameById = useMemo<Map<number, string>>(
    () => new Map(zones.map((zone) => [zone.id, zone.name])),
    [zones],
  );

  // === Zone actions

  function openAddZone(): void {
    setEditingZoneId(null);
    setZoneForm(emptyZoneForm);
    setZoneError(null);
    setShowZoneForm(true);
  }

  function openEditZone(zone: Zone): void {
    setEditingZoneId(zone.id);
    setZoneForm({
      name: zone.name,
      description: zone.description ?? "",
      areas: zone.areas.join(", "),
      delivery_fee: koboToNaira(zone.delivery_fee),
      tier_one: koboToNaira(zone.tier_one_per_package_kobo),
      tier_two: koboToNaira(zone.tier_two_per_package_kobo),
      delivery_cap: koboToNaira(zone.delivery_cap_kobo),
      free_delivery: zone.free_delivery,
      is_active: zone.is_active,
    });
    setZoneError(null);
    setShowZoneForm(true);
  }

  async function handleSaveZone(): Promise<void> {
    const delivery_fee = nairaToKobo(zoneForm.delivery_fee);
    const delivery_cap_kobo = nairaToKobo(zoneForm.delivery_cap);

    if (!zoneForm.name.trim() || zoneForm.name.trim().length < 2) {
      setZoneError("A zone needs a name of at least two characters.");
      return;
    }
    if (Number.isNaN(delivery_fee) || delivery_fee < 0) {
      setZoneError("The base fee must be a valid amount.");
      return;
    }
    if (Number.isNaN(tierOneKobo) || Number.isNaN(tierTwoKobo)) {
      setZoneError("Both taper rates are required.");
      return;
    }
    if (Number.isNaN(delivery_cap_kobo) || delivery_cap_kobo <= 0) {
      setZoneError("The delivery cap must be above zero.");
      return;
    }
    if (tierTwoKobo >= tierOneKobo) {
      setZoneError(TAPER_EXPLANATION);
      return;
    }

    const payload = {
      name: zoneForm.name.trim(),
      description: zoneForm.description.trim() || null,
      areas: zoneForm.areas
        .split(",")
        .map((area) => area.trim())
        .filter(Boolean),
      delivery_fee,
      tier_one_per_package_kobo: tierOneKobo,
      tier_two_per_package_kobo: tierTwoKobo,
      delivery_cap_kobo,
      free_delivery: zoneForm.free_delivery,
      is_active: zoneForm.is_active,
    };

    setSavingZone(true);
    setZoneError(null);
    try {
      if (editingZoneId !== null) {
        await apiMutate(`/admin/pricing/zones/${editingZoneId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiMutate("/admin/pricing/zones", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowZoneForm(false);
      setNotice(
        editingZoneId !== null
          ? `Rates updated for ${payload.name}.`
          : `Zone ${payload.name} created.`,
      );
      await load();
    } catch (err) {
      setZoneError(errorMessage(err, "Could not save that zone."));
    } finally {
      setSavingZone(false);
    }
  }

  /*
   * Throws rather than swallowing: the confirm dialog runs this, and it is the dialog that shows the failure and stays open.
   */
  async function handleDeactivateZone(zone: Zone): Promise<void> {
    setDeactivatingId(zone.id);
    setActionError(null);
    try {
      await apiMutate(`/admin/pricing/zones/${zone.id}`, { method: "DELETE" });
      setZones((prev) =>
        prev.map((row) =>
          row.id === zone.id ? { ...row, is_active: false } : row,
        ),
      );
      setNotice(`${zone.name} is no longer taking orders.`);
    } catch (err) {
      throw new Error(
        errorMessage(err, `Could not deactivate ${zone.name}. Please retry.`),
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  // === Promotion actions

  function openAddPromotion(): void {
    setPromotionForm(emptyPromotionForm);
    setPromotionError(null);
    setPromotionFieldErrors({});
    setShowPromotionForm(true);
  }

  async function handleCreatePromotion(): Promise<void> {
    if (promotionForm.name.trim().length < 2) {
      setPromotionError("Give the campaign a name of at least two characters.");
      return;
    }
    if (!promotionForm.starts_on || !promotionForm.ends_on) {
      setPromotionError("A campaign needs both a start and an end date.");
      return;
    }
    if (promotionForm.scope === "zone" && !promotionForm.zone_id) {
      setPromotionError("A zone-scoped campaign needs a zone.");
      return;
    }

    const startsAt = startOfLocalDay(promotionForm.starts_on);
    const endsAt = endBoundary(promotionForm.ends_on);
    if (endsAt.getTime() <= startsAt.getTime()) {
      setPromotionError("The end date must be on or after the start date.");
      return;
    }

    setSavingPromotion(true);
    setPromotionError(null);
    setPromotionFieldErrors({});
    try {
      await apiMutate("/admin/pricing/promotions", {
        method: "POST",
        body: JSON.stringify({
          name: promotionForm.name.trim(),
          scope: promotionForm.scope,
          zone_id:
            promotionForm.scope === "zone"
              ? Number(promotionForm.zone_id)
              : null,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        }),
      });
      setShowPromotionForm(false);
      setNotice(`Campaign ${promotionForm.name.trim()} scheduled.`);
      await load();
    } catch (err) {
      /*
       * The backend reports starts_at/ends_at/zone_id, the payload's own
       * field names, not the form's starts_on/ends_on date-only inputs, so
       * the camelCased keys are mapped back onto the form's fields by hand.
       */
      const server = extractServerFieldErrors(err);
      setPromotionFieldErrors({
        name: server.name,
        zone_id: server.zoneId,
        starts_on: server.startsAt,
        ends_on: server.endsAt,
      });
      setPromotionError(errorMessage(err, "Could not create that campaign."));
    } finally {
      setSavingPromotion(false);
    }
  }

  /*
   * Held in a ref so row actions can call the current implementation without the memo below having to list a function that is re-declared each render.
   */
  const endPromotionRef = useRef<(promotion: Promotion) => Promise<void>>(
    async () => {},
  );

  async function handleEndPromotion(promotion: Promotion): Promise<void> {
    setEndingId(promotion.id);
    setActionError(null);
    try {
      await apiMutate(`/admin/pricing/promotions/${promotion.id}/end`, {
        method: "PATCH",
      });
      setNotice(`${promotion.name} has been ended.`);
      await load();
    } catch (err) {
      throw new Error(
        errorMessage(err, `Could not end ${promotion.name}. Please retry.`),
      );
    } finally {
      setEndingId(null);
    }
  }

  // === Zone table

  const zoneColumns = useMemo<TableColumn<Zone>[]>(
    () => [
      {
        id: "name",
        header: "Zone",
        priority: "primary",
        minWidth: "14rem",
        sortable: true,
        sortValue: (zone) => zone.name,
        searchValue: (zone) =>
          `${zone.name} ${zone.description ?? ""} ${zone.areas.join(" ")}`,
        cell: (zone) => (
          <TablePrimaryCell
            title={zone.name}
            subtitle={zone.areas.length ? zone.areas.join(", ") : null}
          />
        ),
      },
      {
        id: "delivery_fee",
        header: "Base fee",
        align: "right",
        priority: "secondary",
        sortable: true,
        sortValue: (zone) => zone.delivery_fee,
        cell: (zone) => <TableAmountCell kobo={zone.delivery_fee} />,
      },
      {
        id: "tier_one",
        header: "Tier one / pkg",
        align: "right",
        priority: "secondary",
        sortable: true,
        sortValue: (zone) => zone.tier_one_per_package_kobo,
        cell: (zone) => (
          <TableAmountCell kobo={zone.tier_one_per_package_kobo} />
        ),
      },
      {
        id: "tier_two",
        header: "Tier two / pkg",
        align: "right",
        priority: "secondary",
        sortable: true,
        sortValue: (zone) => zone.tier_two_per_package_kobo,
        cell: (zone) => (
          <TableAmountCell kobo={zone.tier_two_per_package_kobo} />
        ),
      },
      {
        id: "delivery_cap",
        header: "Cap",
        align: "right",
        priority: "detail",
        sortable: true,
        sortValue: (zone) => zone.delivery_cap_kobo,
        cell: (zone) => <TableAmountCell kobo={zone.delivery_cap_kobo} />,
      },
      {
        id: "free_delivery",
        header: "Standing free",
        priority: "detail",
        sortable: true,
        sortValue: (zone) => (zone.free_delivery ? 1 : 0),
        cell: (zone) => (
          <TableTextCell value={zone.free_delivery ? "Yes" : "No"} />
        ),
      },
      {
        id: "is_active",
        header: "Status",
        priority: "trailing",
        sortable: true,
        sortValue: (zone) => (zone.is_active ? 1 : 0),
        cell: (zone) => (
          <TableStatusBadge
            label={zone.is_active ? "Active" : "Inactive"}
            tone={zone.is_active ? "success" : "danger"}
          />
        ),
      },
    ],
    [],
  );

  const zoneActions = useMemo<RowAction<Zone>[]>(
    () => [
      {
        id: "edit",
        label: "Edit rates",
        icon: Pencil,
        iconOnly: true,
        onSelect: openEditZone,
      },
      {
        id: "deactivate",
        label: "Deactivate",
        icon: PowerOff,
        iconOnly: true,
        tone: "danger",
        hidden: (zone) => !zone.is_active,
        isBusy: (zone) => deactivatingId === zone.id,
        onSelect: handleDeactivateZone,
        confirm: {
          dialogKey: "CONFIRM",
          props: (zone) => ({
            title: `Deactivate ${zone.name}?`,
            description:
              "Buyers will no longer be able to pick this zone. Existing orders keep their history, and the zone can be reactivated by editing it.",
            confirmLabel: "Deactivate zone",
          }),
        },
      },
    ],
    [deactivatingId],
  );

  // === Promotion table

  const promotionColumns = useMemo<TableColumn<Promotion>[]>(
    () => [
      {
        id: "name",
        header: "Campaign",
        priority: "primary",
        minWidth: "14rem",
        sortable: true,
        sortValue: (promotion) => promotion.name,
        searchValue: (promotion) =>
          `${promotion.name} ${scopeLabels[promotion.scope]}`,
        cell: (promotion) => (
          <TablePrimaryCell
            title={promotion.name}
            subtitle={
              promotion.scope === "zone"
                ? (zoneNameById.get(promotion.zone_id ?? -1) ?? "Unknown zone")
                : scopeLabels[promotion.scope]
            }
          />
        ),
      },
      {
        id: "scope",
        header: "Scope",
        priority: "secondary",
        sortable: true,
        sortValue: (promotion) => promotion.scope,
        cell: (promotion) => (
          <TableTextCell value={scopeLabels[promotion.scope]} />
        ),
      },
      {
        id: "starts_at",
        header: "Starts",
        priority: "secondary",
        sortable: true,
        sortValue: (promotion) => promotion.starts_at,
        cell: (promotion) => (
          <TableDateCell value={promotion.starts_at} withTime />
        ),
      },
      {
        id: "ends_at",
        header: "Ends",
        priority: "secondary",
        sortable: true,
        sortValue: (promotion) => promotion.ends_at,
        cell: (promotion) => (
          <TableDateCell value={promotion.ends_at} withTime />
        ),
      },
      {
        id: "orders",
        header: "Orders",
        align: "right",
        priority: "detail",
        sortable: true,
        sortValue: (promotion) =>
          costByPromotion.get(promotion.id)?.orders ?? 0,
        cell: (promotion) => (
          <TableTextCell
            value={String(costByPromotion.get(promotion.id)?.orders ?? 0)}
          />
        ),
      },
      {
        id: "forgone",
        header: "Given away",
        align: "right",
        priority: "trailing",
        sortable: true,
        sortValue: (promotion) =>
          costByPromotion.get(promotion.id)?.forgone_kobo ?? 0,
        cell: (promotion) => (
          <TableAmountCell
            kobo={costByPromotion.get(promotion.id)?.forgone_kobo ?? 0}
          />
        ),
      },
      {
        id: "status",
        header: "Status",
        priority: "trailing",
        sortable: true,
        sortValue: (promotion) => (promotion.is_running ? 1 : 0),
        cell: (promotion) => (
          <TableStatusBadge
            label={
              promotion.is_running
                ? "Running"
                : promotion.is_active
                  ? "Scheduled"
                  : "Ended"
            }
            tone={
              promotion.is_running
                ? "success"
                : promotion.is_active
                  ? "info"
                  : "neutral"
            }
          />
        ),
      },
    ],
    [costByPromotion, zoneNameById],
  );

  endPromotionRef.current = handleEndPromotion;

  const promotionActions = useMemo<RowAction<Promotion>[]>(
    () => [
      /*
       * `onSelect` reads `endPromotionRef` through a ref, not captured directly.
       * The memo is keyed on endingId so the busy spinner updates, and re-running it on every render to chase a freshly declared function would defeat the memo entirely.
       */
      {
        id: "end",
        label: "End now",
        icon: PowerOff,
        iconOnly: true,
        tone: "danger",
        hidden: (promotion) => !promotion.is_active,
        isBusy: (promotion) => endingId === promotion.id,
        onSelect: (promotion) => endPromotionRef.current(promotion),
        confirm: {
          dialogKey: "CONFIRM",
          props: (promotion) => ({
            title: `End ${promotion.name} now?`,
            description:
              "Delivery stops being free for this campaign immediately. The window it actually ran for is kept, so its cost still totals correctly.",
            confirmLabel: "End campaign",
          }),
        },
      },
    ],
    [endingId],
  );

  // === Fee rules panel rows

  const feeRuleRows: { label: string; value: string; note: string }[] =
    feeRules === null
      ? []
      : [
          {
            label: "Cost-to-serve rate",
            value: formatPercent(feeRules.service_fee_rate),
            note: "Charged on the basket subtotal.",
          },
          {
            label: "Cost-to-serve floor",
            value: formatFromKobo(feeRules.service_fee_min_kobo),
            note: "The least the fee can be.",
          },
          {
            label: "Cost-to-serve cap",
            value: formatFromKobo(feeRules.service_fee_max_kobo),
            note: "The most the fee can be.",
          },
          {
            label: "Minimum order",
            value: formatFromKobo(feeRules.minimum_order_kobo),
            note: `Or ${feeRules.minimum_order_packages} packages, whichever the checkout enforces.`,
          },
          {
            label: "Individual quote: packages",
            value: String(feeRules.individual_quote_package_threshold),
            note: "At or above this, the basket goes to a quote.",
          },
          {
            label: "Individual quote: subtotal",
            value: formatFromKobo(feeRules.individual_quote_subtotal_kobo),
            note: "At or above this, the basket goes to a quote.",
          },
          {
            label: "Packages in the base fee",
            value: String(feeRules.packages_included_in_base),
            note: "Covered by a zone's base fee before the taper starts.",
          },
          {
            label: "Tier one package count",
            value: String(feeRules.tier_one_package_count),
            note: "How many packages the tier one rate covers.",
          },
          {
            label: "Default tier one rate",
            value: formatFromKobo(feeRules.default_tier_one_per_package_kobo),
            note: "What a new zone starts at, per package.",
          },
          {
            label: "Default tier two rate",
            value: formatFromKobo(feeRules.default_tier_two_per_package_kobo),
            note: "What a new zone starts at, per package.",
          },
          {
            label: "Default cap over base",
            value: formatFromKobo(feeRules.default_delivery_cap_over_base_kobo),
            note: "What a new zone's ceiling starts at, above its base fee.",
          },
        ];

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wallet size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">
            Pricing and Delivery
          </h2>
          <p className="text-body text-sm">
            Correct zone rates and run campaigns without a deploy
          </p>
        </div>
      </div>

      {/* Page-level outcomes */}
      <AnimatePresence>
        {notice && (
          <AlertBanner
            tone="success"
            title={notice}
            onDismiss={() => setNotice(null)}
          />
        )}
        {actionError && (
          <AlertBanner
            tone="danger"
            title={actionError}
            onDismiss={() => setActionError(null)}
          />
        )}
      </AnimatePresence>

      {/* Zones */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            <div>
              <h3 className="font-syne text-heading font-semibold">
                Delivery zones
              </h3>
              <p className="text-body text-sm">
                Base fee, both taper rates, the ceiling and standing free
                delivery
              </p>
            </div>
          </div>
          <SubmitButton
            type="button"
            icon={Plus}
            onClick={openAddZone}
            className="shrink-0"
          >
            Add zone
          </SubmitButton>
        </div>

        <AnimatePresence>
          {showZoneForm && (
            <motion.div
              variants={fadeDownVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitionBase}
              className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-syne text-heading font-semibold">
                  {editingZoneId !== null ? "Edit zone rates" : "New zone"}
                </h4>
                <button
                  type="button"
                  aria-label="Close zone form"
                  onClick={() => setShowZoneForm(false)}
                  className="rounded-full p-1 hover:bg-black/5"
                >
                  <X size={18} className="text-body" />
                </button>
              </div>

              {zoneError && <AlertBanner tone="danger" title={zoneError} />}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TextInputField
                  label="Zone Name"
                  required
                  placeholder="e.g. Kaduna South"
                  value={zoneForm.name}
                  onChange={(e) =>
                    setZoneForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <TextInputField
                  label="Description"
                  placeholder="Optional note"
                  value={zoneForm.description}
                  onChange={(e) =>
                    setZoneForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
                <TextInputField
                  label="Areas"
                  id="zone-areas"
                  placeholder="Comma separated, e.g. Barnawa, Kakuri"
                  value={zoneForm.areas}
                  onChange={(e) =>
                    setZoneForm((p) => ({ ...p, areas: e.target.value }))
                  }
                />
                <NumberInputField
                  label="Base Fee (₦)"
                  id="zone-base-fee"
                  required
                  min={0}
                  step={50}
                  placeholder="e.g. 2500"
                  value={zoneForm.delivery_fee}
                  onChange={(e) =>
                    setZoneForm((p) => ({ ...p, delivery_fee: e.target.value }))
                  }
                />
                <NumberInputField
                  label="Tier One Per Package (₦)"
                  id="zone-tier-one"
                  required
                  min={0}
                  step={50}
                  placeholder="e.g. 700"
                  value={zoneForm.tier_one}
                  onChange={(e) =>
                    setZoneForm((p) => ({ ...p, tier_one: e.target.value }))
                  }
                />
                <NumberInputField
                  label="Tier Two Per Package (₦)"
                  id="zone-tier-two"
                  required
                  min={0}
                  step={50}
                  placeholder="e.g. 400"
                  value={zoneForm.tier_two}
                  onChange={(e) =>
                    setZoneForm((p) => ({ ...p, tier_two: e.target.value }))
                  }
                  error={taperInverted ? TAPER_EXPLANATION : undefined}
                />
                <NumberInputField
                  label="Delivery Cap (₦)"
                  id="zone-cap"
                  required
                  min={1}
                  step={50}
                  placeholder="e.g. 6000"
                  value={zoneForm.delivery_cap}
                  onChange={(e) =>
                    setZoneForm((p) => ({
                      ...p,
                      delivery_cap: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="border-line flex flex-col gap-4 rounded-xl border p-4">
                <ToggleField
                  id="zone-free-delivery"
                  label="Standing free delivery"
                  description="A permanent policy for this area, not a campaign. It stays on when a campaign ends."
                  checked={zoneForm.free_delivery}
                  onCheckedChange={(checked) =>
                    setZoneForm((p) => ({ ...p, free_delivery: checked }))
                  }
                />
                <ToggleField
                  id="zone-is-active"
                  label="Active"
                  description="Inactive zones cannot be picked at checkout."
                  checked={zoneForm.is_active}
                  onCheckedChange={(checked) =>
                    setZoneForm((p) => ({ ...p, is_active: checked }))
                  }
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <SubmitButton
                  type="button"
                  icon={Check}
                  loading={savingZone}
                  loadingText="Saving..."
                  /* The server refuses an inverted taper too, but a disabled button with a reason beats relaying a 400. */
                  disabled={taperInverted}
                  onClick={() => void handleSaveZone()}
                >
                  {editingZoneId !== null ? "Save rates" : "Create zone"}
                </SubmitButton>
                <SubmitButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowZoneForm(false)}
                >
                  Cancel
                </SubmitButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DataTable
          rows={zones}
          columns={zoneColumns}
          actions={zoneActions}
          caption="Delivery zones"
          showSearch
          searchPlaceholder="Search zones by name or area"
          loading={loading}
          error={loadError}
          onRetry={() => void load()}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <TableEmptyState
              icon={MapPin}
              title="No zones yet"
              description={'Click "Add zone" to create the first one.'}
            />
          }
        />
      </section>

      {/* Promotions */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-primary" />
            <div>
              <h3 className="font-syne text-heading font-semibold">
                Free-delivery campaigns
              </h3>
              <p className="text-body text-sm">
                What is running, what it has given away, and how to stop it
              </p>
            </div>
          </div>
          <SubmitButton
            type="button"
            icon={Plus}
            onClick={openAddPromotion}
            className="shrink-0"
          >
            New campaign
          </SubmitButton>
        </div>

        <AnimatePresence>
          {showPromotionForm && (
            <motion.div
              variants={fadeDownVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitionBase}
              className="border-line flex flex-col gap-4 rounded-2xl border bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-syne text-heading font-semibold">
                  New campaign
                </h4>
                <button
                  type="button"
                  aria-label="Close campaign form"
                  onClick={() => setShowPromotionForm(false)}
                  className="rounded-full p-1 hover:bg-black/5"
                >
                  <X size={18} className="text-body" />
                </button>
              </div>

              {promotionError && (
                <AlertBanner tone="danger" title={promotionError} />
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TextInputField
                  label="Campaign Name"
                  required
                  placeholder="e.g. Ramadan free delivery"
                  value={promotionForm.name}
                  error={promotionFieldErrors.name}
                  onChange={(e) =>
                    setPromotionForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <SelectInputField
                  label="Scope"
                  name="promotion_scope"
                  options={scopeOptions}
                  value={promotionForm.scope}
                  onChange={(e) =>
                    setPromotionForm((p) => ({
                      ...p,
                      scope: e.target.value as PromotionScope,
                    }))
                  }
                />
                {promotionForm.scope === "zone" && (
                  <SelectInputField
                    label="Zone"
                    name="promotion_zone_id"
                    placeholder="Select a zone"
                    required
                    options={zones
                      .filter((zone) => zone.is_active)
                      .map((zone) => ({
                        value: String(zone.id),
                        label: zone.name,
                      }))}
                    value={promotionForm.zone_id}
                    error={promotionFieldErrors.zone_id}
                    onChange={(e) =>
                      setPromotionForm((p) => ({
                        ...p,
                        zone_id: e.target.value,
                      }))
                    }
                  />
                )}
                <DateInputField
                  label="Starts On"
                  id="promotion-starts-on"
                  required
                  value={promotionForm.starts_on}
                  error={promotionFieldErrors.starts_on}
                  onChange={(e) =>
                    setPromotionForm((p) => ({
                      ...p,
                      starts_on: e.target.value,
                    }))
                  }
                />
                <DateInputField
                  label="Ends On"
                  id="promotion-ends-on"
                  required
                  value={promotionForm.ends_on}
                  error={promotionFieldErrors.ends_on}
                  onChange={(e) =>
                    setPromotionForm((p) => ({ ...p, ends_on: e.target.value }))
                  }
                />
              </div>

              <p className="text-body text-xs">
                Both dates are inclusive. The campaign runs from the start of
                the first day to the end of the last.
              </p>

              <div className="flex flex-wrap gap-3">
                <SubmitButton
                  type="button"
                  icon={Check}
                  loading={savingPromotion}
                  loadingText="Scheduling..."
                  onClick={() => void handleCreatePromotion()}
                >
                  Schedule campaign
                </SubmitButton>
                <SubmitButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPromotionForm(false)}
                >
                  Cancel
                </SubmitButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DataTable
          rows={promotions}
          columns={promotionColumns}
          actions={promotionActions}
          caption="Free-delivery campaigns"
          showSearch
          searchPlaceholder="Search campaigns by name or scope"
          loading={loading}
          error={loadError}
          onRetry={() => void load()}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <TableEmptyState
              icon={Megaphone}
              title="No campaigns yet"
              description={'Click "New campaign" to schedule one.'}
            />
          }
        />
      </section>

      {/* Fee rules, read only */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-primary" />
          <div>
            <h3 className="font-syne text-heading font-semibold">Fee rules</h3>
            <p className="text-body text-sm">
              The platform-wide rules every zone is priced against
            </p>
          </div>
        </div>

        <AlertBanner
          tone="info"
          title="These are code, not settings."
          description="Every figure below is served straight from the pricing package, which is the single source of truth for money. Changing one is a deploy, not an edit on this page. A second copy of a rate is how a placeholder price outlived the product it described."
        />

        {feeRules === null ? (
          <div className="bg-line h-40 animate-pulse rounded-2xl" />
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feeRuleRows.map((rule) => (
              <div
                key={rule.label}
                className="border-line flex flex-col gap-1 rounded-2xl border bg-white p-4"
              >
                <dt className="text-body text-xs font-medium">{rule.label}</dt>
                <dd className="font-syne text-heading text-lg font-bold">
                  {rule.value}
                </dd>
                <p className="text-body text-xs">{rule.note}</p>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
