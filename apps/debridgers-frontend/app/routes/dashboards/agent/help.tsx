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
      className="border-gray-border rounded-xl border bg-white"
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-syne text-heading text-sm font-semibold sm:text-base">
          {item.question}
        </span>
        {open ? (
          <ChevronUp size={18} className="text-text shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-text shrink-0" />
        )}
      </button>
      {open && (
        <div className="text-text px-5 pb-4 text-sm leading-relaxed">
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
        <HelpCircle size={24} className="text-primary" />
        <div>
          <h2 className="font-syne text-heading text-xl font-bold">
            Help Center
          </h2>
          <p className="text-text text-sm">
            Answers to common questions for agents
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.a
          href="https://chat.whatsapp.com/GjMvQOIbO9qAFjUGR3ZYVK?s=sw&p=i&mlu=2"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-gray-border flex items-center gap-4 rounded-2xl border bg-white p-5 transition-all duration-300 ease-in-out hover:shadow-md"
        >
          <span className="bg-status-active-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <MessageCircle size={20} className="text-status-active-text" />
          </span>
          <div>
            <p className="font-syne text-heading font-semibold">
              WhatsApp Support
            </p>
            <p className="text-text text-sm">Chat with your manager directly</p>
          </div>
        </motion.a>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border-gray-border flex items-center gap-4 rounded-2xl border bg-white p-5"
        >
          <span className="bg-status-pending-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <BookOpen size={20} className="text-status-pending-text" />
          </span>
          <div>
            <p className="font-syne text-heading font-semibold">
              Agent Guidelines
            </p>
            <p className="text-text text-sm">
              Rules, expectations, and best practices
            </p>
          </div>
        </motion.div>
      </div>

      {/* FAQs */}
      <div className="flex flex-col gap-3">
        <h3 className="font-syne text-heading font-semibold">
          Frequently Asked Questions
        </h3>
        {faqs.map((item, i) => (
          <FaqRow key={item.question} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
