import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Settings } from "lucide-react";
import { apiFetch } from "@debridgers/api-client";
import { formatFromKobo, DashNumberInput } from "@debridgers/ui-web";

export function meta() {
  return [
    { title: "Settings | Debridgers Admin" },
    {
      name: "description",
      content:
        "Manage Debridgers platform settings and administrative configurations.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface PlatformSettings {
  agent_commission_rate: number;
  buyer_referral_discount_kobo: number;
  buyer_referral_discount_type: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState("");
  const [discountKobo, setDiscountKobo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PlatformSettings>("/admin/settings")
      .then((data) => {
        setSettings(data);
        setCommissionRate(String(data.agent_commission_rate));
        setDiscountKobo(
          String(Math.round(data.buyer_referral_discount_kobo / 100)),
        );
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(key: string, value: string) {
    await apiFetch("/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ key, value }),
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 1 || rate > 100) {
        setError("Commission rate must be between 1 and 100.");
        return;
      }
      const kobo = Math.round(parseFloat(discountKobo) * 100);
      if (isNaN(kobo) || kobo < 0) {
        setError("Referral discount must be a valid amount.");
        return;
      }
      await saveSetting("agent_commission_rate", String(rate));
      await saveSetting("buyer_referral_discount_kobo", String(kobo));
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              agent_commission_rate: rate,
              buyer_referral_discount_kobo: kobo,
            }
          : prev,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="bg-line h-40 rounded-2xl" />
        <div className="bg-line h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-status-delivered text-status-delivered-fg flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          >
            <CheckCircle2 size={16} /> Settings saved successfully.
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-status-cancelled text-status-cancelled-fg rounded-xl px-4 py-3 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commission Rate */}
      <div className="border-line flex flex-col gap-5 rounded-2xl border bg-white p-6">
        <div className="border-line flex items-center gap-2 border-b pb-3">
          <Settings size={18} className="text-primary" />
          <h3 className="font-syne text-heading text-lg font-semibold">
            Agent Commission Rate
          </h3>
        </div>

        <p className="text-body text-sm">
          The percentage of each sale that agents earn as commission. Current:{" "}
          <strong>{settings?.agent_commission_rate ?? "—"}%</strong>
        </p>

        {/* The unit lives in the label, so no adornment is needed. */}
        <div className="flex max-w-80 flex-col gap-1.5">
          <DashNumberInput
            label="Commission Rate (%)"
            required
            min={1}
            max={100}
            step={0.5}
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
          />
          <p className="text-body text-xs">
            Agents earn this % on every confirmed order. Range: 1–100.
          </p>
        </div>
      </div>

      {/* Buyer Referral Discount */}
      <div className="border-line flex flex-col gap-5 rounded-2xl border bg-white p-6">
        <div className="border-line flex items-center gap-2 border-b pb-3">
          <Settings size={18} className="text-primary" />
          <h3 className="font-syne text-heading text-lg font-semibold">
            Buyer Referral Discount
          </h3>
        </div>

        <p className="text-body text-sm">
          The flat discount a buyer earns when a friend they referred places
          their first order. Current:{" "}
          <strong>
            {settings
              ? formatFromKobo(settings.buyer_referral_discount_kobo)
              : "—"}
          </strong>
        </p>

        <div className="flex max-w-80 flex-col gap-1.5">
          <DashNumberInput
            label="Discount Amount (₦)"
            required
            min={0}
            step={50}
            value={discountKobo}
            onChange={(e) => setDiscountKobo(e.target.value)}
          />
          <p className="text-body text-xs">
            Applied as a flat discount at checkout. Expires 90 days after
            earning.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary rounded-full px-8 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
