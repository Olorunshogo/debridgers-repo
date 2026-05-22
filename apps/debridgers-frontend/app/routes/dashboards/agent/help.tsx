import { motion } from "framer-motion";
import {
  HelpCircle,
  MessageCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

export function meta() {
  return [
    { title: "Help Center | Debridgers Agent" },
    {
      name: "description",
      content:
        "Get help with your Debridgers agent account: FAQs, guides, and support.",
    },
    // === Author and Robots
    { name: "author", content: "Debridgers Team" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

// === Types
interface FaqItem {
  question: string;
  answer: string;
}

// === Data
const faqs: FaqItem[] = [
  {
    question: "How do I request new stock?",
    answer:
      "Go to Request Stock from the sidebar, fill in the quantity you need, and submit. Your manager will approve and arrange delivery to your pickup point.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Payments are processed every Friday. Your commission is calculated based on the number of bags sold during the week (Monday–Thursday).",
  },
  {
    question: "How do I submit my daily report?",
    answer:
      "Navigate to Daily Report in the sidebar. Fill in the number of bags sold, cash collected, and any notes. Reports must be submitted before 8pm each day.",
  },
  {
    question: "What happens if I miss a daily report?",
    answer:
      "Missing reports affect your leaderboard ranking and may delay your payout. Contact your manager via WhatsApp if you missed a report due to an emergency.",
  },
  {
    question: "How is my leaderboard rank calculated?",
    answer:
      "Your rank is based on total bags sold in the current week. Ties are broken by the number of days reported on time.",
  },
  {
    question: "How do I remit cash to the company?",
    answer:
      "Cash remittance details are provided by your manager. After remitting, record it in your daily report. Always keep your payment receipt.",
  },
];

// === FAQ item component
function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border"
      style={{
        borderColor: "var(--border-gray)",
        backgroundColor: "var(--white)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span
          className="font-syne text-sm font-semibold sm:text-base"
          style={{ color: "var(--heading-colour)" }}
        >
          {item.question}
        </span>
        {open ? (
          <ChevronUp
            size={18}
            style={{ color: "var(--text-colour)" }}
            className="shrink-0"
          />
        ) : (
          <ChevronDown
            size={18}
            style={{ color: "var(--text-colour)" }}
            className="shrink-0"
          />
        )}
      </button>
      {open && (
        <div
          className="px-5 pb-4 text-sm leading-relaxed"
          style={{ color: "var(--text-colour)" }}
        >
          {item.answer}
        </div>
      )}
    </motion.div>
  );
}

// === Page
export default function AgentHelpPage() {
  return (
    <div className="py-section-px flex flex-col gap-6">
      {/* Header */}
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
            Answers to common questions for agents
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.a
          href="https://wa.me/+2348167042797"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 ease-in-out hover:shadow-md"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--status-active-bg)" }}
          >
            <MessageCircle
              size={20}
              style={{ color: "var(--status-active-text)" }}
            />
          </span>
          <div>
            <p
              className="font-syne font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              WhatsApp Support
            </p>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              Chat with your manager directly
            </p>
          </div>
        </motion.a>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-4 rounded-2xl border p-5"
          style={{
            borderColor: "var(--border-gray)",
            backgroundColor: "var(--white)",
          }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--status-pending-bg)" }}
          >
            <BookOpen
              size={20}
              style={{ color: "var(--status-pending-text)" }}
            />
          </span>
          <div>
            <p
              className="font-syne font-semibold"
              style={{ color: "var(--heading-colour)" }}
            >
              Agent Guidelines
            </p>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              Rules, expectations, and best practices
            </p>
          </div>
        </motion.div>
      </div>

      {/* FAQs */}
      <div className="flex flex-col gap-3">
        <h3
          className="font-syne font-semibold"
          style={{ color: "var(--heading-colour)" }}
        >
          Frequently Asked Questions
        </h3>
        {faqs.map((item, i) => (
          <FaqRow key={item.question} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
