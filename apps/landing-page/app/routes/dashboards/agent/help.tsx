import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router";
import {
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  LifeBuoy,
  FileText,
  Boxes,
  Wallet2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function meta() {
  return [
    { title: "Help Center | Debridgers" },
    {
      name: "description",
      content:
        "Get answers to common questions and find support resources in the Debridgers agent help center.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface FAQItem {
  id: string;
  category: string;
  q: string;
  a: string;
}

const FAQS = [
  {
    id: "faq-1",
    category: "Daily reporting",
    q: "How do I submit a daily report?",
    a: "Go to Daily Report in the sidebar, fill in the number of pages sold for the day, and click Submit Report. Reports must be submitted before midnight.",
  },
  {
    id: "faq-2",
    category: "Commission & payouts",
    q: "How is my commission calculated?",
    a: "You earn 30% commission on every page sold. Your commission is calculated automatically based on your daily reports and credited to your wallet after admin approval.",
  },
  {
    id: "faq-3",
    category: "Stock requests",
    q: "How do I request new stock?",
    a: "Navigate to Request Stock, enter the quantity of packs you need, and submit. The admin will review and dispatch your stock within 1-2 business days.",
  },
  {
    id: "faq-4",
    category: "Commission & payouts",
    q: "When do I get paid?",
    a: "Commissions are paid out weekly every Friday. You can withdraw your available balance from the Wallet page to your registered bank account.",
  },
  {
    id: "faq-5",
    category: "Daily reporting",
    q: "What happens if my report is rejected?",
    a: "You will receive a notification explaining the reason. You can resubmit a corrected report from the Daily Report page.",
  },
] satisfies FAQItem[];

const QUICK_ACTIONS = [
  {
    label: "Daily Report",
    desc: "Submit today's report and keep your records up to date.",
    icon: FileText,
    to: "/agent-dashboard/daily-report",
  },
  {
    label: "Request Stock",
    desc: "Request fresh stock for your next sales cycle.",
    icon: Boxes,
    to: "/agent-dashboard/request-stock",
  },
  {
    label: "Wallet",
    desc: "Check your balance and manage withdrawals.",
    icon: Wallet2,
    to: "/agent-dashboard/wallet",
  },
];

export default function AgentHelp() {
  const [open, setOpen] = useState<string | null>(FAQS[0]?.id ?? null);
  const [query, setQuery] = useState("");

  const filteredFaqs = FAQS.filter((faq) => {
    const value = query.toLowerCase().trim();
    if (!value) return true;
    return (
      faq.q.toLowerCase().includes(value) ||
      faq.a.toLowerCase().includes(value) ||
      faq.category.toLowerCase().includes(value)
    );
  });

  return (
    <div className="py-section-px flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <HelpCircle size={24} style={{ color: "var(--primary-color)" }} />
        <div>
          <h2
            className="font-syne text-xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            Help Center
          </h2>
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Quick answers, useful links, and direct support
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {QUICK_ACTIONS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={item.to}
                className="group flex h-full flex-col gap-3 rounded-2xl border p-4 transition-colors hover:opacity-90"
                style={{
                  borderColor: "var(--border-gray)",
                  backgroundColor: "var(--white)",
                }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--bg-light)" }}
                >
                  <Icon size={18} style={{ color: "var(--primary-color)" }} />
                </span>
                <div className="flex flex-col gap-1">
                  <p
                    className="font-syne text-base font-semibold"
                    style={{ color: "var(--heading-colour)" }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {item.desc}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <LifeBuoy size={16} style={{ color: "var(--primary-color)" }} />
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--heading-colour)" }}
          >
            Search FAQs
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keyword, e.g. payout, stock, report..."
          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--bg-light)",
            color: "var(--heading-colour)",
          }}
        />
      </div>

      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        {filteredFaqs.length === 0 && (
          <div
            className="px-5 py-8 text-sm"
            style={{ color: "var(--text-colour)" }}
          >
            No matching result found. Try another keyword.
          </div>
        )}
        {filteredFaqs.map((faq, i) => (
          <motion.div
            key={faq.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="border-b last:border-0"
            style={{ borderColor: "var(--border-gray)" }}
          >
            <button
              onClick={() => setOpen(open === faq.id ? null : faq.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex flex-col">
                <span
                  className="mb-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: "var(--bg-light)",
                    color: "var(--text-colour)",
                  }}
                >
                  {faq.category}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--heading-colour)" }}
                >
                  {faq.q}
                </span>
              </div>
              {open === faq.id ? (
                <ChevronUp size={16} style={{ color: "var(--text-colour)" }} />
              ) : (
                <ChevronDown
                  size={16}
                  style={{ color: "var(--text-colour)" }}
                />
              )}
            </button>
            <AnimatePresence initial={false}>
              {open === faq.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-5 pb-4 text-sm"
                    style={{ color: "var(--text-colour)" }}
                  >
                    {faq.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.a
          href="https://wa.me/+2348167042797"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 rounded-2xl border p-4 transition-opacity hover:opacity-90"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle size={18} color="#fff" />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              WhatsApp Support
            </p>
            <p className="text-xs" style={{ color: "var(--text-colour)" }}>
              Fastest response
            </p>
          </div>
        </motion.a>

        <motion.a
          href="tel:+2348167042797"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-3 rounded-2xl border p-4 transition-opacity hover:opacity-90"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "#E8F0FE" }}
          >
            <Phone size={17} style={{ color: "#1D4ED8" }} />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              Call Support
            </p>
            <p className="text-xs" style={{ color: "var(--text-colour)" }}>
              Mon - Fri, 9am - 5pm
            </p>
          </div>
        </motion.a>

        <motion.a
          href="mailto:support@debridgers.com"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 rounded-2xl border p-4 transition-opacity hover:opacity-90"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "#FFF4D4" }}
          >
            <Mail size={17} style={{ color: "#B45309" }} />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              Email Support
            </p>
            <p className="text-xs" style={{ color: "var(--text-colour)" }}>
              Response within 24 hours
            </p>
          </div>
        </motion.a>
      </div>

      <div
        className="rounded-2xl border p-5"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Still need help?
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-colour)" }}>
          Share your issue with your agent ID, order or report number, and a
          short description so we can assist you faster.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://wa.me/+2348167042797"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--primary-color)" }}
          >
            Chat on WhatsApp
          </a>
          <a
            href="mailto:support@debridgers.com"
            className="rounded-full px-5 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--bg-light)",
              color: "var(--heading-colour)",
            }}
          >
            Send an Email
          </a>
        </div>
      </div>
    </div>
  );
}
