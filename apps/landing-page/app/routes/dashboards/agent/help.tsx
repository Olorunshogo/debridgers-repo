import { useState } from "react";
import { motion } from "framer-motion";
import {
  HelpCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function meta() {
  return [{ title: "Help Center | Debridgers" }];
}

const FAQS = [
  {
    q: "How do I submit a daily report?",
    a: "Go to Daily Report in the sidebar, fill in the number of pages sold for the day, and click Submit Report. Reports must be submitted before midnight.",
  },
  {
    q: "How is my commission calculated?",
    a: "You earn 30% commission on every page sold. Your commission is calculated automatically based on your daily reports and credited to your wallet after admin approval.",
  },
  {
    q: "How do I request new stock?",
    a: "Navigate to Request Stock, enter the quantity of packs you need, and submit. The admin will review and dispatch your stock within 1-2 business days.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions are paid out weekly every Friday. You can withdraw your available balance from the Wallet page to your registered bank account.",
  },
  {
    q: "What happens if my report is rejected?",
    a: "You will receive a notification explaining the reason. You can resubmit a corrected report from the Daily Report page.",
  },
];

export default function AgentHelp() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
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
            Answers to common questions
          </p>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        {FAQS.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="border-b last:border-0"
            style={{ borderColor: "var(--border-gray)" }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--heading-colour)" }}
              >
                {faq.q}
              </span>
              {open === i ? (
                <ChevronUp size={16} style={{ color: "var(--text-colour)" }} />
              ) : (
                <ChevronDown
                  size={16}
                  style={{ color: "var(--text-colour)" }}
                />
              )}
            </button>
            {open === i && (
              <div
                className="px-5 pb-4 text-sm"
                style={{ color: "var(--text-colour)" }}
              >
                {faq.a}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.a
        href="https://wa.me/+2348167042797"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4 rounded-2xl border p-5 transition-opacity hover:opacity-90"
        style={{
          borderColor: "var(--border-gray)",
          backgroundColor: "var(--white)",
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle size={20} color="#fff" />
        </div>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--heading-colour)" }}
          >
            Still need help?
          </p>
          <p className="text-sm" style={{ color: "var(--text-colour)" }}>
            Chat with us on WhatsApp - we typically reply within minutes.
          </p>
        </div>
      </motion.a>
    </div>
  );
}
