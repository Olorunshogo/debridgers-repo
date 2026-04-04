import type { Route } from "../+types/home";
import { useState, useEffect, useRef } from "react";
import { Header } from "../../components/Header";
import { HeroSection } from "@/components/HeroSection";
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
    { title: "Contact Us | Debridgers" },
    {
      name: "description",
      content:
        "Get in touch with Debridgers for quotes, partnerships, or support.",
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
    value: "support@debridgers.com",
    href: "mailto:support@debridgers.com",
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
        .bindPopup("Debridgers — Barnawa Market Road, Kaduna")
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
      {/* Header */}
      <div className="top-md sticky z-500">
        <Header
          navLinks={[
            { label: "Home", href: "/" },
            { label: "Agents", href: "/agents" },
            { label: "Contact Us", href: "/contact" },
          ]}
          signUpHref="/signup"
        />
      </div>

      {/* Hero Section */}
      <div className="relative flex max-h-[800px] w-full flex-col xl:max-h-[900px]">
        {/* Hero Section */}
        <div className="-mt-navbar-h flex min-h-0 w-full">
          <div className="from-primary -mt-navbar-h via-primary to-primary absolute inset-0 z-0 overflow-hidden bg-linear-to-b" />
          <HeroSection
            images={["/images/hero-1.jpg"]}
            servingLocation="Now Serving in Kaduna"
            headingParts={{
              top: [{ text: "Market Prices." }],
              bottom: [
                { text: "Zero " },
                { text: "Market", highlight: true },
                { text: " Stress." },
              ],
            }}
            subtext="Fresh foodstuff delivered straight to your door or shop — at the same price you'd pay at Central Market."
            secondaryCta={{ label: "Contact Us ", href: "#contact-us" }}
            trustItems={[
              { icon: "lucide:check", label: "Guarantee fresh produce" },
              {
                icon: "lucide:map-pin",
                label: "Sarbon Tasha • Narayi• Kakuri",
              },
              { icon: "lucide:tag", label: "Transparent, fixed pricing" },
              { icon: "lucide:truck", label: "Fast Delivery" },
            ]}
          />
        </div>
      </div>

      <section className="font-openSans h-full w-full bg-white">
        <div className="px-section-px gap-4xl sm:px-section-px-sm lg:px-section-px-lg py-section-py sm:py-section-py-sm lg:py-section-py-lg default-max-width mx-auto flex flex-col">
          {/* Contact Heading */}
          <div className="gap-base flex flex-col items-center text-center">
            <h2 className="font-open-sans text-2xl text-[14px] font-semibold sm:text-3xl sm:text-xl lg:text-4xl">
              Contact Debridgers
            </h2>
            <p className="text-text text-xl text-[10px] lg:text-2xl">
              We&apos;re here to help you reach out with any question or
              partnership inquires{" "}
            </p>
          </div>

          {/* Contact Form */}
          <div
            id="contact-us"
            className="gap-2xl lg:gap-4xl grid grid-cols-1 lg:grid-cols-2"
          >
            {/* Form */}
            <div className="gap-2xl border-primary flex flex-col rounded-2xl border bg-white px-[18px] py-[20px] lg:border-0">
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
                    className="flex flex-col items-center gap-(--gap-base) py-12 text-center"
                  >
                    <CheckCircle2
                      className="h-14 w-14"
                      style={{ color: "var(--color-primary)" }}
                    />
                    <h3 className="text-xl font-bold text-black">
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
                    className="gap-4xl flex flex-col pb-[120px] lg:pb-0"
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
                      label="Email"
                      name="email"
                      placeholder="Enter your email"
                      required
                      value={form.email}
                      onChange={handleChange("email")}
                      error={!!errors.email}
                      errorMessage={errors.email}
                    />

                    <TextareaInput
                      label="Your Message"
                      name="message"
                      placeholder="Type your message here"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange("message")}
                      error={!!errors.message}
                      errorMessage={errors.message}
                    />

                    <SubmitButton
                      loading={loading}
                      loadingText="Sending..."
                      className="mx-auto w-full max-w-[500px]"
                    >
                      Send Message
                    </SubmitButton>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Right column: info + map */}
            <div className="gap-4xl flex flex-col">
              {/* Contact info cards */}
              <div className="gap-md flex flex-col">
                {contactItems.map(({ icon: Icon, label, value, href }) => {
                  const inner = (
                    <div className="border-gray flex w-full items-center gap-[14px] rounded-2xl border p-5 lg:border-0">
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#A7E8BF]">
                        <Icon className="text-primary h-8 w-8" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-text text-xl font-bold tracking-widest capitalize">
                          {label}
                        </span>
                        <span className="text-text text-base lg:text-lg">
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
              <div className="border-gray relative h-96 overflow-hidden rounded-2xl border shadow-sm lg:h-auto lg:min-h-84 lg:flex-1">
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
