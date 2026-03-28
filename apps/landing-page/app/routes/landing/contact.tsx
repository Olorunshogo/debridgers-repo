import type { Route } from "../+types/home";
import { useState, useEffect, useRef } from "react";
import { Header } from "../../components/Header";
import { Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TextInput,
  EmailInput,
  TextareaInput,
  SubmitButton,
} from "@debridgers/ui-web";

// === Metadata
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Contact Us | Debridger" },
    {
      name: "description",
      content:
        "Get in touch with Debridger for quotes, partnerships, or support.",
    },
  ];
}

// === Types
interface ContactForm {
  fullName: string;
  email: string;
  message: string;
}

type FormErrors = Partial<Record<keyof ContactForm, string>>;

// === Validation
function validate(form: ContactForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.fullName.trim() || form.fullName.trim().length < 2) {
    errors.fullName = "Name must be at least 2 characters.";
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim() || !emailRe.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }

  const wordCount = form.message.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 5) {
    errors.message = "Message must be at least 5 words.";
  } else if (form.message.length > 1000) {
    errors.message = "Message cannot exceed 1000 characters.";
  }

  return errors;
}

// === Contact Info Items
const contactItems = [
  {
    icon: Phone,
    label: "Phone",
    value: "+234 701 228 8798",
    href: "tel:+2347012288798",
  },
  {
    icon: Mail,
    label: "Email",
    value: "support@debridger.com",
    href: "mailto:support@debridger.com",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Active 24hrs",
    href: undefined,
  },
];

// === Leaflet Map (client-only)
function ContactMap({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined" || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Debridger — Barnawa Market Road, Kaduna")
        .openPopup();

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, zoom]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} className="h-full w-full" />
    </>
  );
}

// === Main Page
export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>({
    fullName: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(field: keyof ContactForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error on change
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Production-ready: replace with your actual API endpoint
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message ?? "Something went wrong. Please try again.",
        );
      }

      setSubmitted(true);
      setForm({ fullName: "", email: "", message: "" });
    } catch (err) {
      setErrors({
        message:
          err instanceof Error
            ? err.message
            : "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Minimal header — no hero image on contact */}
      <div
        className="flex flex-col gap-0"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <Header
          navLinks={[
            { label: "How it works", href: "/#how-it-works" },
            { label: "Why Us", href: "/#why-us" },
            { label: "Home", href: "/" },
          ]}
          signUpHref="https://wa.me/+2347012288798"
        />

        {/* Page title banner */}
        <div className="px-lg flex flex-col items-center gap-(--gap-base) pt-36 pb-20 text-center text-white">
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--color-secondary)" }}
          >
            Get in touch
          </p>
          <h1 className="text-4xl leading-tight font-bold lg:text-5xl">
            Contact Debridger
          </h1>
          <p className="max-w-md text-base text-green-200">
            We&apos;re here to help with any question or partnership inquiry.
          </p>
        </div>
      </div>

      <main className="font-openSans bg-bg-light">
        <section className="px-section sm:px-section-px-sm lg:px-section-px-lg py-section-py-sm lg:py-section-py-lg mx-auto max-w-7xl">
          <div className="gap-4xl grid grid-cols-1 lg:grid-cols-2">
            {/* ── Form ── */}
            <div className="flex flex-col gap-(--gap-2xl) rounded-2xl bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-(--gap-sm)">
                <h2 className="text-2xl font-bold text-gray-900">
                  Send Us A Message
                </h2>
                <p className="text-sm text-gray-500">
                  We typically respond within a few hours.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-(--gap-base) py-12 text-center"
                  >
                    <CheckCircle2
                      className="h-14 w-14"
                      style={{ color: "var(--color-primary)" }}
                    />
                    <h3 className="text-xl font-bold text-gray-900">
                      Message sent!
                    </h3>
                    <p className="max-w-xs text-sm text-gray-500">
                      Thanks for reaching out. We&apos;ll get back to you
                      shortly.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-sm font-semibold underline underline-offset-2"
                      style={{ color: "var(--color-primary)" }}
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    noValidate
                    className="flex flex-col gap-(--gap-xl)"
                  >
                    <TextInput
                      label="Full Name"
                      name="fullName"
                      placeholder="Enter your full name"
                      required
                      value={form.fullName}
                      onChange={handleChange("fullName")}
                      error={!!errors.fullName}
                      errorMessage={errors.fullName}
                    />

                    <EmailInput
                      label="Email Address"
                      name="email"
                      placeholder="you@example.com"
                      required
                      value={form.email}
                      onChange={handleChange("email")}
                      error={!!errors.email}
                      errorMessage={errors.email}
                    />

                    <TextareaInput
                      label="Your Message"
                      name="message"
                      placeholder="Tell us how we can help..."
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange("message")}
                      error={!!errors.message}
                      errorMessage={errors.message}
                    />

                    <SubmitButton loading={loading} loadingText="Sending...">
                      Send Message
                    </SubmitButton>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* ── Right column: info + map ── */}
            <div className="flex flex-col gap-(--gap-2xl)">
              {/* Contact info cards */}
              <div className="flex flex-col gap-(--gap-base)">
                {contactItems.map(({ icon: Icon, label, value, href }) => {
                  const inner = (
                    <div className="flex items-center gap-(--gap-base)">
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor:
                            "var(--color-secondary-light, #fef3c7)",
                        }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: "var(--color-secondary)" }}
                        />
                      </span>
                      <div className="flex flex-col gap-(--gap-sm)">
                        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                          {label}
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          {value}
                        </span>
                      </div>
                    </div>
                  );

                  return href ? (
                    <a
                      key={label}
                      href={href}
                      className="rounded-2xl bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div
                      key={label}
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>

              {/* Map */}
              <div className="relative h-80 overflow-hidden rounded-2xl border border-gray-200 shadow-sm lg:h-auto lg:min-h-64 lg:flex-1">
                <ContactMap lat={10.4831} lng={7.4324} zoom={15} />
                <div className="absolute right-2 bottom-2 z-10 rounded bg-white/90 px-2 py-1 text-xs text-gray-500 shadow">
                  © OpenStreetMap
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
