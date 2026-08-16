import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  SearchX,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  DashSearchInput,
  DashSubmitButton,
  SUPPORT,
  supportMailtoHref,
  supportTelHref,
  supportWhatsAppHref,
  useDialog,
} from "@debridgers/ui-web";
import type { FaqItem, HelpCategory, HelpContent } from "./help-content";

// === Types

export interface HelpCenterProps {
  heading: string;
  subheading: string;
  content: HelpContent;
  /* Pre-fills the support ticket so the user retypes nothing. */
  defaultName?: string;
  defaultEmail?: string;
}

type ActiveCategory = HelpCategory | "all";

// === FAQ row

function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState<boolean>(false);
  const panelId = useId();
  const buttonId = useId();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03 }}
      className="border-gray-border rounded-xl border bg-white"
    >
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((p) => !p)}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span className="font-syne text-heading text-sm font-semibold sm:text-base">
            {item.question}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-text shrink-0"
          >
            <ChevronDown size={18} />
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-text px-5 pb-4 text-sm leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// === Contact card

interface ContactCardProps {
  icon: typeof Phone;
  title: string;
  detail: string;
  href: string;
  /* tel: and mailto: must stay in the same tab; wa.me should not. */
  external?: boolean;
  delay: number;
}

function ContactCard({
  icon: Icon,
  title,
  detail,
  href,
  external = false,
  delay,
}: ContactCardProps) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="border-gray-border flex items-center gap-4 rounded-2xl border bg-white p-5 transition-all duration-300 ease-in-out hover:shadow-md"
    >
      <span className="bg-status-active-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <Icon size={20} className="text-status-active-text" />
      </span>
      <div className="min-w-0">
        <p className="font-syne text-heading font-semibold">{title}</p>
        <p className="text-text truncate text-sm">{detail}</p>
      </div>
    </motion.a>
  );
}

// === Page shell

export function HelpCenter({
  heading,
  subheading,
  content,
  defaultName,
  defaultEmail,
}: HelpCenterProps) {
  const { triggerDialog } = useDialog();
  const [query, setQuery] = useState<string>("");
  const [category, setCategory] = useState<ActiveCategory>("all");

  const filtered = useMemo<FaqItem[]>(() => {
    const term = query.trim().toLowerCase();

    return content.faqs.filter((faq) => {
      const inCategory = category === "all" || faq.category === category;
      if (!inCategory) return false;
      if (!term) return true;

      return (
        faq.question.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term)
      );
    });
  }, [content.faqs, query, category]);

  function openGuide(): void {
    triggerDialog("HELP_GUIDE", {
      title: content.guideTitle,
      subtitle: content.guideSubtitle,
      sections: content.guideSections,
    });
  }

  function openTicket(): void {
    triggerDialog("SUPPORT_TICKET", { defaultName, defaultEmail });
  }

  return (
    <div className="py-section-px flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HelpCircle size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">
            {heading}
          </h2>
          <p className="text-text text-sm">{subheading}</p>
        </div>
      </div>

      {/* Contact channels */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ContactCard
            icon={Phone}
            title="Call us"
            detail={SUPPORT.phoneDisplay}
            href={supportTelHref}
            delay={0}
          />
          <ContactCard
            icon={MessageCircle}
            title="WhatsApp"
            detail="Chat with support directly"
            href={supportWhatsAppHref()}
            external
            delay={0.05}
          />
          <ContactCard
            icon={Mail}
            title="Email us"
            detail={SUPPORT.supportEmail}
            href={supportMailtoHref}
            delay={0.1}
          />

          <motion.button
            type="button"
            onClick={openGuide}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="border-gray-border flex cursor-pointer items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-all duration-300 ease-in-out hover:shadow-md"
          >
            <span className="bg-status-pending-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <BookOpen size={20} className="text-status-pending-text" />
            </span>
            <div>
              <p className="font-syne text-heading font-semibold">
                {content.guideTitle}
              </p>
              <p className="text-text text-sm">{content.guideSubtitle}</p>
            </div>
          </motion.button>
        </div>

        <p className="text-text text-xs">
          Phone and WhatsApp support is available {SUPPORT.hours}. Email us any
          time and we will reply during those hours.
        </p>
      </div>

      {/* Search and categories */}
      <div className="flex flex-col gap-3">
        <h3 className="font-syne text-heading font-semibold">
          Frequently Asked Questions
        </h3>

        <DashSearchInput
          placeholder="Search for an answer..."
          aria-label="Search frequently asked questions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2">
          {content.categories.map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-pressed={category === tab.key}
              onClick={() => setCategory(tab.key)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                category === tab.key
                  ? "bg-primary text-white"
                  : "bg-bg-light text-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3" aria-live="polite">
        {filtered.length === 0 ? (
          <div className="border-gray-border flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-white px-6 py-12 text-center">
            <SearchX size={28} className="text-icon-secondary" />
            <div>
              <p className="font-syne text-heading font-semibold">
                No answers matched that
              </p>
              <p className="text-text text-sm">
                Try a different word, or send us the question directly.
              </p>
            </div>
            <DashSubmitButton type="button" onClick={openTicket}>
              Contact support
            </DashSubmitButton>
          </div>
        ) : (
          filtered.map((item, i) => (
            <FaqRow key={item.question} item={item} index={i} />
          ))
        )}
      </div>

      {/* Ticket fallback */}
      {filtered.length > 0 && (
        <div className="border-gray-border flex flex-col items-start gap-3 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-syne text-heading font-semibold">
              Still need help?
            </p>
            <p className="text-text text-sm">
              Send us a message and we will reply by email.
            </p>
          </div>
          <DashSubmitButton type="button" onClick={openTicket}>
            Contact support
          </DashSubmitButton>
        </div>
      )}
    </div>
  );
}
