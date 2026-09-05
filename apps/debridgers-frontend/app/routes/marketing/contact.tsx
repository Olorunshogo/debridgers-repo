import type { Route } from "./+types/contact";
import { useState, useEffect, useRef } from "react";
import { Header } from "../../components/marketing/Header";
import { useAuth } from "../../contexts/AuthContext";
import { HeroSection } from "../../components/marketing/HeroSection";
import { Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TextInputField,
  EmailInputField,
  TextareaField,
  SubmitButton,
  isValidEmail,
  SUPPORT,
  supportMailtoHref,
  supportTelHref,
} from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "@debridgers/api-client";
/*
 * Leaflet ships its own stylesheet and marker images and is a real dependency,
 * so both are bundled rather than fetched from unpkg. Pulling them from a CDN
 * meant a slow or blocked network rendered the map with no stylesheet and no
 * marker, which looks like a broken map rather than a failed request.
 */
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { marketingNavLinks } from "@/components/marketing/data/data";
// === Metadata
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Contact Debridgers | Get in Touch" },
    {
      name: "description",
      content:
        "Reach out to Debridgers for orders, partnership inquiries or support. Our team is available Monday to Friday, 9am to 5pm. Call, email or send us a message and we will get back to you promptly.",
    },
    {
      name: "keywords",
      content:
        "contact Debridgers, Debridgers support, food delivery Kaduna contact, Debridgers phone number, Debridgers email, partnership Debridgers Nigeria",
    },

    // === Open Graph
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://debridgers.com/contact" },
    { property: "og:site_name", content: "Debridgers" },
    { property: "og:title", content: "Contact Debridgers | Get in Touch" },
    {
      property: "og:description",
      content:
        "Reach out to Debridgers for orders, partnership inquiries or support. Our team is available Monday to Friday, 9am to 5pm.",
    },
    { property: "og:image", content: "https://debridgers.com/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: "Debridgers — fresh foodstuff at market prices in Kaduna",
    },
    { property: "og:locale", content: "en_NG" },

    // === Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@debridgers" },
    { name: "twitter:url", content: "https://debridgers.com/contact" },
    { name: "twitter:title", content: "Contact Debridgers | Get in Touch" },
    {
      name: "twitter:description",
      content:
        "Reach out to Debridgers for orders, partnership inquiries or support. Our team is available Monday to Friday, 9am to 5pm.",
    },
    { name: "twitter:image", content: "https://debridgers.com/og-image.png" },
    {
      name: "twitter:image:alt",
      content: "Debridgers — fresh foodstuff at market prices in Kaduna",
    },

    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "index, follow" },
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

  if (!form.email.trim() || !isValidEmail(form.email)) {
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
    value: SUPPORT.phoneDisplay,
    href: supportTelHref,
  },
  {
    icon: Mail,
    label: "Email",
    value: SUPPORT.supportEmail,
    href: supportMailtoHref,
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: SUPPORT.hours,
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
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
      });

      const map = L.map(mapRef.current).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup("Debridgers - Barnawa Market Road, Kaduna")
        .openPopup();

      /*
       * Leaflet measures its container once, at construction. This one is in a
       * flex column that finishes sizing after the dynamic import resolves, so
       * without this the tiles lay out against a stale height and the map
       * renders part-drawn or grey.
       */
      requestAnimationFrame(() => map.invalidateSize());

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

  /* A concrete minimum height, not just h-full: the parent is `lg:h-auto`, so
     a purely relative height collapses to zero and Leaflet draws nothing. */
  return <div ref={mapRef} className="h-full min-h-96 w-full" />;
}

// === Main Page
export default function ContactPage() {
  const { isAuthenticated, dashboardPath } = useAuth();
  const [form, setForm] = useState<ContactForm>({
    fullName: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

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
      const res = await fetch(`${BASE_BACKEND_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.fullName,
          email: form.email,
          message: form.message,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string })?.message ??
            "Something went wrong. Please try again.",
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
      <Header
        navLinks={marketingNavLinks}
        signUpHref="/signup"
        isAuthenticated={isAuthenticated}
        dashboardPath={dashboardPath}
      />

      {/* Hero Section */}
      <div className="relative flex w-full flex-col">
        <div className="-mt-navbar-h flex min-h-0 w-full flex-1">
          <div className="from-primary -mt-navbar-h via-primary to-primary absolute inset-0 z-0 overflow-hidden bg-linear-to-b" />
          <section className="font-syne relative mx-auto flex h-full min-h-screen w-full flex-col overflow-hidden">
            <HeroSection
              images={["/images/landing/hero-1.jpg"]}
              servingLocation="Now Serving in Kaduna"
              headingParts={{
                top: [{ text: "Get In" }],
                bottom: [
                  { text: "Touch" },
                  { text: " With Us", highlight: true },
                  { text: "." },
                ],
              }}
              subtext="Reach out for orders, partnership inquiries or support. Our team is available Monday to Friday, 9am to 5pm."
              secondaryCta={{ label: "Contact Us", href: "#contact-us" }}
              trustItems={[
                { icon: "lucide:phone", label: SUPPORT.phoneDisplay },
                {
                  icon: "lucide:mail",
                  label: SUPPORT.supportEmail,
                },
                { icon: "lucide:clock", label: SUPPORT.hours },
                { icon: "lucide:map-pin", label: "Kaduna, Nigeria" },
              ]}
            />
          </section>
        </div>
      </div>

      <section className="font-openSans h-full w-full bg-white">
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg py-section-py sm:py-section-py-sm lg:py-section-py-lg section-max-width mx-auto flex flex-col gap-10">
          {/* Contact Heading */}
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-open-sans text-2xl font-semibold sm:text-3xl lg:text-4xl">
              Contact Debridgers
            </h2>
            <p className="text-body text-2.5 text-xl lg:text-2xl">
              We&apos;re here to help you reach out with any question or
              partnership inquires{" "}
            </p>
          </div>

          {/* Contact Form */}
          <div
            id="contact-us"
            className="grid grid-cols-1 gap-7 lg:grid-cols-2 lg:gap-10"
          >
            {/* Form */}
            <div className="border-primary flex flex-col gap-7 rounded-2xl border bg-white px-4.5 py-5 lg:border-0">
              <h2 className="font-open-sans text-2xl font-semibold text-black">
                Send Us A Message
              </h2>

              <AnimatePresence mode="sync">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-(--gap-4) py-12 text-center"
                  >
                    <CheckCircle2 className="text-primary h-14 w-14" />
                    <h3 className="text-xl font-bold text-black">
                      Message sent!
                    </h3>
                    <p className="max-w-100 text-sm text-gray-500">
                      Thanks for reaching out. We&apos;ll get back to you
                      shortly.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-primary text-sm font-semibold underline underline-offset-2"
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
                    className="flex flex-col gap-10 pb-30 lg:pb-0"
                  >
                    <TextInputField
                      variant="pill"
                      label="Full Name"
                      name="fullName"
                      placeholder="Enter your full name"
                      required
                      value={form.fullName}
                      onChange={handleChange("fullName")}
                      error={errors.fullName}
                    />

                    <EmailInputField
                      variant="pill"
                      label="Email"
                      name="email"
                      placeholder="Enter your email"
                      required
                      value={form.email}
                      onChange={handleChange("email")}
                      error={errors.email}
                    />

                    <TextareaField
                      variant="pill"
                      label="Your Message"
                      name="message"
                      placeholder="Type your message here"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange("message")}
                      error={errors.message}
                    />

                    <SubmitButton
                      variant="block"
                      loading={loading}
                      loadingText="Sending..."
                      className="mx-auto w-full max-w-125"
                    >
                      Send Message
                    </SubmitButton>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Right column: info + map */}
            <div className="flex flex-col gap-10">
              {/* Contact info cards */}
              <div className="flex flex-col gap-3">
                {contactItems.map(({ icon: Icon, label, value, href }) => {
                  const inner = (
                    <div className="border-line flex w-full items-center gap-3 rounded-2xl border p-5 lg:border-0">
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#A7E8BF]">
                        <Icon className="text-primary h-8 w-8" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-body text-xl font-bold tracking-widest capitalize">
                          {label}
                        </span>
                        <span className="text-body text-base lg:text-lg">
                          {value}
                        </span>
                      </div>
                    </div>
                  );

                  return href ? (
                    <a key={label} href={href} className="flex items-center">
                      {inner}
                    </a>
                  ) : (
                    <div key={label} className="">
                      {inner}
                    </div>
                  );
                })}
              </div>

              {/* Map */}
              <div className="border-line relative h-96 overflow-hidden rounded-2xl border shadow-sm lg:h-auto lg:min-h-84 lg:flex-1">
                <ContactMap lat={10.4831} lng={7.4324} zoom={15} />
                <div className="absolute right-2 bottom-2 z-2 rounded bg-white/90 px-2 py-1 text-xs text-gray-500 shadow">
                  © OpenStreetMap
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
