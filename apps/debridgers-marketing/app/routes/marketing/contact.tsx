import type { Route } from "./+types/contact";
import { useState } from "react";
import { buildPageMeta } from "../../lib/seo";
import { Header } from "../../components/marketing/Header";
import { useAuth } from "@debridgers/ui-web";
import {
  Mail,
  Phone,
  MessageCircle,
  CheckCircle2,
  Leaf,
  Linkedin,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TextInputField,
  EmailInputField,
  TextareaField,
  SelectField,
  SubmitButton,
  isValidEmail,
  extractServerFieldErrors,
  SUPPORT,
  supportMailtoHref,
  supportTelHref,
  supportWhatsAppHref,
} from "@debridgers/ui-web";
import { BASE_BACKEND_URL } from "@debridgers/api-client";
/*
 * The map that used to live here moved to its own component after the
 * docs/Screens redesign dropped it from this page's layout. Left unused
 * rather than deleted - see ContactMap.tsx.
 */
// import { ContactMap } from "../../components/marketing/ContactMap";

import { marketingNavLinks } from "@/components/marketing/data/data";
// === Metadata
export function meta({}: Route.MetaArgs) {
  return buildPageMeta({
    title: "Contact Debridgers | Get in Touch",
    description:
      "Reach out to Debridgers for orders, partnership inquiries or support. Our team is available Monday to Friday, 9am to 5pm.",
    path: "/contact",
    keywords: [
      "contact Debridgers",
      "Debridgers support",
      "food delivery Kaduna contact",
      "Debridgers phone number",
      "Debridgers email",
      "partnership Debridgers Nigeria",
    ],
  });
}

// === Types
interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

type FormErrors = Partial<Record<keyof ContactForm, string>>;

// === Validation
function validate(form: ContactForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.firstName.trim() || form.firstName.trim().length < 2) {
    errors.firstName = "First name must be at least 2 characters.";
  }

  if (!form.lastName.trim() || form.lastName.trim().length < 2) {
    errors.lastName = "Last name must be at least 2 characters.";
  }

  if (!form.email.trim() || !isValidEmail(form.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!form.subject) {
    errors.subject = "Please select an inquiry type.";
  }

  /* Keep this rule in step with createContactSchema on the backend: a plain character minimum, not a word count, so the two never disagree about whether a given message is valid. */
  const message = form.message.trim();
  if (message.length < 15) {
    errors.message = "Message must be at least 15 characters.";
  } else if (message.length > 1000) {
    errors.message = "Message cannot exceed 1000 characters.";
  }

  return errors;
}

// === Subject options
const subjectOptions = [
  { value: "general", label: "General Inquiry" },
  { value: "order_support", label: "Order Support" },
  { value: "partnership", label: "Partnership" },
  { value: "feedback", label: "Feedback" },
  { value: "other", label: "Other" },
];

// === Contact channel cards
interface ContactCardData {
  icon: LucideIcon;
  title: string;
  description: string;
  value: string;
  href?: string;
}

const contactCardsData: ContactCardData[] = [
  {
    icon: Mail,
    title: "Email Us",
    description: "Drop us a line anytime. We aim to reply within 24 hours.",
    value: SUPPORT.supportEmail,
    href: supportMailtoHref,
  },
  {
    icon: Phone,
    title: "Call Us",
    description: `${SUPPORT.hours}. We're ready to chat.`,
    value: SUPPORT.phoneDisplay,
    href: supportTelHref,
  },
  {
    icon: MessageCircle,
    title: "Message Us",
    description: "Get immediate assistance from our support team.",
    value: "Open Live Chat",
    href: supportWhatsAppHref(),
  },
];

interface ContactCardProps {
  card: ContactCardData;
}

/* Same hover convention as the "Why Debridgers" cards on the landing page: group-hover fills the card with the brand green and flips text/icon to white. */
function ContactCard({ card }: ContactCardProps) {
  const Icon = card.icon;

  const content = (
    <motion.div
      whileHover={{ y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="group border-line font-open-sans hover:border-primary hover:bg-primary flex h-full w-full flex-col items-center gap-3 rounded-3xl border bg-white px-6 py-8 text-center transition-all duration-300 ease-in-out"
    >
      <span className="text-primary flex h-16 w-16 items-center justify-center rounded-full bg-[#A7E8BF] transition-all duration-300 group-hover:bg-white/20 group-hover:text-white">
        <Icon className="h-8 w-8" />
      </span>
      <h3 className="text-heading text-xl font-bold transition-colors duration-300 group-hover:text-white">
        {card.title}
      </h3>
      <p className="text-body text-sm transition-colors duration-300 group-hover:text-emerald-100">
        {card.description}
      </p>
      <span className="text-heading font-semibold transition-colors duration-300 group-hover:text-white">
        {card.value}
      </span>
    </motion.div>
  );

  return card.href ? (
    <a href={card.href} className="flex h-full">
      {content}
    </a>
  ) : (
    content
  );
}

// === Main Page
export default function ContactPage() {
  const { isAuthenticated, dashboardPath } = useAuth();
  const [form, setForm] = useState<ContactForm>({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  function handleChange(field: keyof ContactForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  }

  function handleSubjectChange(value: string) {
    setForm((prev) => ({ ...prev, subject: value }));
    if (errors.subject) {
      setErrors((prev) => ({ ...prev, subject: undefined }));
    }
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
          full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          email: form.email,
          subject: form.subject,
          message: form.message,
        }),
      });

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => ({}));
        const err = new Error(
          (body as { message?: string })?.message ??
            "Something went wrong. Please try again.",
        ) as Error & { body?: unknown };
        /* So extractServerFieldErrors can read the field errors. */
        err.body = body;
        throw err;
      }

      setSubmitted(true);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      const serverFieldErrors = extractServerFieldErrors(err);
      if (Object.keys(serverFieldErrors).length > 0) {
        setErrors(serverFieldErrors);
      } else {
        setErrors({
          message:
            err instanceof Error
              ? err.message
              : "Network error. Please try again.",
        });
      }
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
        surface="solid"
      />

      <section className="font-openSans -mt-navbar-h flex min-h-dvh w-full items-center bg-[#F9FAF9]">
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg py-section-py sm:py-section-py-sm lg:py-section-py-lg section-max-width mx-auto flex w-full flex-col gap-10 lg:gap-16">
          {/* Contact Heading */}
          <div className="pt-navbar-h flex flex-col items-center gap-6 text-center lg:pt-0">
            {/* Contact Button */}
            <div className="font-open-sans inline-flex w-fit items-center gap-2.5 rounded-full bg-[#111827] py-6 pr-9.5 pl-8 text-sm font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5 text-[#AAD267]" />
              <span className="text-sm text-white">Contact Us</span>
            </div>

            <h2 className="font-open-sans text-xl font-semibold sm:text-2xl lg:text-3xl">
              We&apos;re Here to Help
            </h2>
          </div>

          {/* Channel cards */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12 } },
            }}
            className="font-open-sans grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6"
          >
            {contactCardsData.map((card) => (
              <motion.div
                key={card.title}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <ContactCard card={card} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="font-openSans h-full w-full bg-white">
        <div className="px-section-px sm:px-section-px-sm lg:px-section-px-lg py-section-py sm:py-section-py-sm lg:py-section-py-lg section-max-width mx-auto flex flex-col gap-10 lg:gap-16">
          <div
            id="contact-us"
            className="grid grid-cols-1 gap-7 lg:grid-cols-2 lg:gap-10"
          >
            {/* Form */}
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-1.5">
                <h2 className="font-open-sans text-2xl font-semibold text-[#3F3B3B]">
                  Send a Message
                </h2>
                <p className="text-body">
                  Fill out the form below and we&apos;ll get back to you
                  swiftly.
                </p>
              </div>

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
                    className="flex flex-col gap-7 pb-30 lg:pb-0"
                  >
                    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
                      <TextInputField
                        variant="pill"
                        label="First Name"
                        name="firstName"
                        placeholder="John"
                        required
                        value={form.firstName}
                        onChange={handleChange("firstName")}
                        error={errors.firstName}
                      />

                      <TextInputField
                        variant="pill"
                        label="Last Name"
                        name="lastName"
                        placeholder="Doe"
                        required
                        value={form.lastName}
                        onChange={handleChange("lastName")}
                        error={errors.lastName}
                      />
                    </div>

                    <EmailInputField
                      variant="pill"
                      label="Email address"
                      name="email"
                      placeholder="johndoe@gmail.com"
                      required
                      value={form.email}
                      onChange={handleChange("email")}
                      error={errors.email}
                    />

                    <SelectField
                      label="Subject"
                      options={subjectOptions}
                      placeholder="Select any inquiry type"
                      required
                      value={form.subject}
                      onChange={handleSubjectChange}
                      error={errors.subject}
                    />

                    <TextareaField
                      variant="pill"
                      label="Your Message"
                      name="message"
                      placeholder="How can we help you today?"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange("message")}
                      error={errors.message}
                    />

                    <SubmitButton
                      variant="tertiary"
                      loading={loading}
                      loadingText="Sending..."
                      className="w-fit py-3 text-white"
                    >
                      Send Message
                    </SubmitButton>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Right column: commitments + socials */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <h2 className="font-open-sans text-2xl font-semibold text-black">
                  Committed to You
                </h2>
                <p className="text-body">
                  Our relationship with our customers is as important as our
                  relationship with the land. We strive to provide transparent,
                  honest, and timely support.
                </p>
              </div>

              <div className="border-line border-t" />

              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.12 } },
                }}
                className="flex flex-col gap-6"
              >
                {[
                  {
                    icon: CheckCircle2,
                    title: "Quality Guaranteed",
                    description:
                      "If your order isn't perfect, we'll make it right.",
                  },
                  {
                    icon: Leaf,
                    title: "Farm-Direct Transparency",
                    description:
                      "Know exactly where your food comes from, always.",
                  },
                ].map(({ icon: Icon, title, description }) => (
                  <motion.div
                    key={title}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex items-start gap-3"
                  >
                    <Icon className="text-primary mt-0.5 h-6 w-6 shrink-0" />
                    <div className="flex flex-col gap-1">
                      <h3 className="text-heading font-semibold">{title}</h3>
                      <p className="text-body font-open-sans text-sm">
                        {description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div className="border-line border-t" />

              <div className="flex flex-col gap-3">
                <span className="text-body font-open-sans text-sm font-semibold tracking-widest uppercase">
                  Follow Our Journey
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={SUPPORT.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-primary flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity duration-300 hover:opacity-90"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                  <a
                    href={supportWhatsAppHref()}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-primary flex h-9 w-9 items-center justify-center rounded-full text-white transition-opacity duration-300 hover:opacity-90"
                  >
                    <Icon icon="cib:whatsapp" className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
