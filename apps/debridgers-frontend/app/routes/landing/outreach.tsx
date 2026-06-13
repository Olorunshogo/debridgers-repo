import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MapPin, Phone, User, Package } from "lucide-react";
import { Header } from "../../components/landing/Header";
import { SubmitButton, WhatsAppLink } from "@debridgers/ui-web";
import { useAuth } from "../../contexts/AuthContext";
import { BASE_BACKEND_URL } from "@debridgers/api-client";
import { kadunaLgas, kadunaAreasByLga } from "../../models/models";

export function meta() {
  return [
    { title: "Register Your Interest | Debridgers" },
    {
      name: "description",
      content:
        "Tell us what you need. A Debridgers agent will reach out to you within 24 hours.",
    },
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "index, follow" },
  ];
}

interface LgaOption {
  value: string;
  label: string;
}

const LANDING_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Agents", href: "/agents" },
  { label: "Contact Us", href: "/contact" },
];

const HOW_HEARD_OPTIONS = [
  "Word of mouth",
  "Social media",
  "Flyer / Ad",
  "Agent visit",
  "Other",
];

const OUTREACH_BENEFITS = [
  "A dedicated agent contacts you within 24 hours",
  "We source products at market prices with no markups",
  "Bulk and regular order discounts available",
  "Delivery to your home or shop in Kaduna",
];

export default function OutreachPage() {
  const { isAuthenticated, dashboardPath } = useAuth();

  const [form, setForm] = useState<{
    owner_name: string;
    phone: string;
    shop_name: string;
    lga: string;
    area: string;
    product_interest: string;
    quantity: string;
    how_heard: string;
    notes: string;
  }>({
    owner_name: "",
    phone: "",
    shop_name: "",
    lga: "",
    area: "",
    product_interest: "",
    quantity: "",
    how_heard: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const lgas = (kadunaLgas as LgaOption[]).map((l) =>
    typeof l === "string" ? l : (l as { value: string }).value,
  );

  const areas =
    form.lga && form.lga in (kadunaAreasByLga as Record<string, unknown[]>)
      ? ((kadunaAreasByLga as Record<string, LgaOption[]>)[form.lga] ?? []).map(
          (a) => (typeof a === "string" ? a : (a as { value: string }).value),
        )
      : [];

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) =>
      field === "lga"
        ? { ...prev, lga: value, area: "" }
        : { ...prev, [field]: value },
    );

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.owner_name.trim() || form.owner_name.trim().length < 2)
      errs.owner_name = "Full name is required";
    if (!form.phone.trim() || form.phone.trim().length < 7)
      errs.phone = "Phone number is required";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_BACKEND_URL}/outreach/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_name: form.owner_name.trim(),
          phone: form.phone.trim(),
          shop_name: form.shop_name.trim() || undefined,
          lga: form.lga || undefined,
          area: form.area || undefined,
          product_interest: form.product_interest.trim() || undefined,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          how_heard: form.how_heard || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Submission failed.");
      setSubmitted(true);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="sticky top-3 z-50 bg-white">
        <Header
          navLinks={LANDING_NAV_LINKS}
          signUpHref="/signup"
          isAuthenticated={isAuthenticated}
          dashboardPath={dashboardPath}
        />
      </div>

      <section
        aria-label="Page header"
        className="bg-primary py-section-py sm:py-section-py-sm lg:py-section-py-lg relative w-full"
      >
        <div className="landing-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto">
          <div className="mx-auto max-w-300 text-center">
            <p className="font-open-sans mb-3 text-sm font-semibold tracking-widest text-white/70 uppercase">
              We come to you
            </p>
            <h1 className="font-syne mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Tell us what you need.
            </h1>
            <p className="font-open-sans mx-auto max-w-130 text-base leading-relaxed text-white/80">
              Fill in the form below and a Debridgers agent will reach out to
              you within 24 hours, whether you want bulk orders, regular
              deliveries, or just want to know more.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Interest registration form"
        className="py-section-py sm:py-section-py-sm lg:py-section-py-lg relative w-full bg-[#F6F3F3]"
      >
        <div className="landing-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg mx-auto">
          <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
            {/* Form */}
            <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-5 py-12 text-center"
                  >
                    <div className="bg-status-delivered-bg flex h-16 w-16 items-center justify-center rounded-full">
                      <CheckCircle2
                        size={32}
                        className="text-status-delivered-text"
                      />
                    </div>
                    <h2 className="font-syne text-heading text-2xl font-bold">
                      We&apos;ve got your details!
                    </h2>
                    <p className="text-text max-w-sm text-sm leading-relaxed">
                      An agent will reach out to you within 24 hours. Want to
                      speed things up?
                    </p>
                    <WhatsAppLink
                      label="Chat with us on WhatsApp"
                      className="w-full justify-center sm:w-fit"
                    />
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    noValidate
                    className="flex flex-col gap-5"
                  >
                    <h2 className="font-syne text-heading mb-1 text-xl font-bold">
                      Register your interest
                    </h2>

                    {apiError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-status-cancelled-bg text-status-cancelled-text rounded-xl px-4 py-3 text-sm"
                      >
                        {apiError}
                      </motion.p>
                    )}

                    {/* Row 1: Name + Phone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-heading text-sm font-medium">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User
                            size={14}
                            className="text-text absolute top-1/2 left-3.5 -translate-y-1/2 opacity-40"
                          />
                          <input
                            type="text"
                            value={form.owner_name}
                            onChange={(e) =>
                              handleChange("owner_name", e.target.value)
                            }
                            placeholder="Amina Musa"
                            className="border-gray-border focus:border-primary w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm outline-none"
                          />
                        </div>
                        {errors.owner_name && (
                          <p className="text-xs text-red-500">
                            {errors.owner_name}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-heading text-sm font-medium">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone
                            size={14}
                            className="text-text absolute top-1/2 left-3.5 -translate-y-1/2 opacity-40"
                          />
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) =>
                              handleChange("phone", e.target.value)
                            }
                            placeholder="08012345678"
                            className="border-gray-border focus:border-primary w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm outline-none"
                          />
                        </div>
                        {errors.phone && (
                          <p className="text-xs text-red-500">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Business / shop name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-heading text-sm font-medium">
                        Business / Shop Name{" "}
                        <span className="text-text font-normal">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={form.shop_name}
                        onChange={(e) =>
                          handleChange("shop_name", e.target.value)
                        }
                        placeholder="e.g. Mama Nkechi's Store"
                        className="border-gray-border focus:border-primary w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                      />
                    </div>

                    {/* LGA + Area */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-heading text-sm font-medium">
                          LGA{" "}
                          <span className="text-text font-normal">
                            (optional)
                          </span>
                        </label>
                        <div className="relative">
                          <MapPin
                            size={14}
                            className="text-text absolute top-1/2 left-3.5 -translate-y-1/2 opacity-40"
                          />
                          <select
                            value={form.lga}
                            onChange={(e) => {
                              setForm((p) => ({
                                ...p,
                                lga: e.target.value,
                                area: "",
                              }));
                            }}
                            className="border-gray-border text-heading focus:border-primary w-full appearance-none rounded-xl border py-2.5 pr-4 pl-9 text-sm outline-none"
                          >
                            <option value="">Select LGA</option>
                            {lgas.map((lga) => (
                              <option key={lga} value={lga}>
                                {lga}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-heading text-sm font-medium">
                          Area{" "}
                          <span className="text-text font-normal">
                            (optional)
                          </span>
                        </label>
                        <select
                          value={form.area}
                          onChange={(e) => handleChange("area", e.target.value)}
                          disabled={!form.lga || areas.length === 0}
                          className="border-gray-border text-heading focus:border-primary w-full rounded-xl border px-4 py-2.5 text-sm outline-none disabled:opacity-40"
                        >
                          <option value="">Select area</option>
                          {areas.map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Products interested in */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-heading text-sm font-medium">
                        Products you&apos;re interested in{" "}
                        <span className="text-text font-normal">
                          (optional)
                        </span>
                      </label>
                      <div className="relative">
                        <Package
                          size={14}
                          className="text-text absolute top-3.5 left-3.5 opacity-40"
                        />
                        <input
                          type="text"
                          value={form.product_interest}
                          onChange={(e) =>
                            handleChange("product_interest", e.target.value)
                          }
                          placeholder="e.g. Rice, Palm Oil, Beans"
                          className="border-gray-border focus:border-primary w-full rounded-xl border py-2.5 pr-4 pl-9 text-sm outline-none"
                        />
                      </div>
                    </div>

                    {/* Quantity + How heard */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-heading text-sm font-medium">
                          Estimated quantity needed{" "}
                          <span className="text-text font-normal">
                            (optional)
                          </span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={form.quantity}
                          onChange={(e) =>
                            handleChange("quantity", e.target.value)
                          }
                          placeholder="e.g. 5 bags"
                          className="border-gray-border focus:border-primary w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-heading text-sm font-medium">
                          How did you hear about us?{" "}
                          <span className="text-text font-normal">
                            (optional)
                          </span>
                        </label>
                        <select
                          value={form.how_heard}
                          onChange={(e) =>
                            handleChange("how_heard", e.target.value)
                          }
                          className="border-gray-border text-heading focus:border-primary w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                        >
                          <option value="">Select one</option>
                          {HOW_HEARD_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-heading text-sm font-medium">
                        Notes / message{" "}
                        <span className="text-text font-normal">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) => handleChange("notes", e.target.value)}
                        placeholder="Anything else you'd like us to know..."
                        className="border-gray-border focus:border-primary w-full resize-none rounded-xl border px-4 py-2.5 text-sm outline-none"
                      />
                    </div>

                    <SubmitButton
                      loading={loading}
                      loadingText="Sending..."
                      className="mt-1 rounded-full"
                    >
                      Register My Interest
                    </SubmitButton>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-6">
              {/* Value prop */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="font-syne text-heading mb-4 font-semibold">
                  Why register?
                </h3>
                <ul className="flex flex-col gap-3">
                  {OUTREACH_BENEFITS.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2
                        size={16}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      <span className="text-text text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* WhatsApp CTA */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-text mb-3 text-sm">
                  Prefer to chat directly? Send us a message on WhatsApp.
                  We&apos;re always available.
                </p>
                <WhatsAppLink
                  label="Chat on WhatsApp"
                  className="w-full justify-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
