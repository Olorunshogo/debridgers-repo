import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  Package,
  TrendingUp,
  Truck,
  UserCircle,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

export function meta() {
  return [
    { title: "Help Center | Debridgers Agent" },
    {
      name: "description",
      content:
        "Get help with your Debridgers agent account: FAQs, agent guidelines, and support.",
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

interface GuideSection {
  icon: React.ReactNode;
  title: string;
  steps: string[];
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
      "Payments are processed every Friday. Your commission is calculated based on the number of bags sold during the week (Monday to Thursday).",
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

const guideSections: GuideSection[] = [
  {
    icon: <UserCircle size={18} />,
    title: "Getting Started",
    steps: [
      "Log in with your registered email and password.",
      "Confirm your profile details are correct in Settings.",
      "Use the sidebar to navigate between your overview, daily reports, orders, and wallet.",
    ],
  },
  {
    icon: <Package size={18} />,
    title: "Requesting & Receiving Stock",
    steps: [
      "Go to Request Stock in the sidebar and enter the quantity you need.",
      "Submit your request - your manager will review and approve it.",
      "Once approved, your stock will be delivered to your assigned pickup point.",
      "Confirm receipt in the app so your inventory is updated.",
    ],
  },
  {
    icon: <Truck size={18} />,
    title: "Submitting Daily Reports",
    steps: [
      "Navigate to Daily Report in the sidebar each day.",
      "Enter the number of bags sold, total cash collected, and any returns.",
      "Add notes for any issues such as damaged stock or delivery problems.",
      "Submit before 8pm - late or missed reports affect your ranking and payout.",
    ],
  },
  {
    icon: <Wallet size={18} />,
    title: "Earnings & Commission",
    steps: [
      "Your commission is calculated automatically from your weekly sales.",
      "View your current balance and payout history from the Wallet section.",
      "Payments are processed every Friday for the Monday to Thursday sales period.",
      "Contact your manager if there is a discrepancy in your payout.",
    ],
  },
  {
    icon: <TrendingUp size={18} />,
    title: "Leaderboard & Performance",
    steps: [
      "Your leaderboard rank is based on total bags sold in the current week.",
      "Ties are broken by number of days reported on time.",
      "Top-ranked agents may receive bonuses and priority stock allocation.",
      "Consistent reporting and high sales are the fastest way to move up.",
    ],
  },
  {
    icon: <AlertCircle size={18} />,
    title: "Reporting a Problem",
    steps: [
      "For stock discrepancies or damaged items, contact your manager immediately via WhatsApp.",
      "Include your agent code, date, and a clear description of the problem.",
      "For missed reports due to emergencies, reach out within 24 hours so it can be noted.",
      "All reported issues are reviewed within 24 hours.",
    ],
  },
];

// === FAQ row
function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-gray-border rounded-xl border bg-white"
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
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

// === Agent Guide Modal
function AgentGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex w-full cursor-pointer items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex w-full max-w-[92%] flex-col rounded-t-3xl bg-white sm:max-w-180 sm:rounded-3xl"
        style={{ maxHeight: "88dvh" }}
      >
        {/* Modal header */}
        <div className="border-gray-border flex shrink-0 items-center justify-between border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="bg-status-pending-bg flex h-9 w-9 items-center justify-center rounded-full">
              <BookOpen size={18} className="text-status-pending-text" />
            </span>
            <div>
              <h3 className="font-syne text-heading font-bold">Agent Guide</h3>
              <p className="text-text text-xs">
                How selling, reporting, and payouts work
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-gray-border flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 ease-in-out hover:bg-red-50"
          >
            <X size={16} className="text-error-red" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4">
            {guideSections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-gray-border flex flex-col gap-3 rounded-xl border bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-status-pending-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                    <span className="text-status-pending-text">
                      {section.icon}
                    </span>
                  </span>
                  <h4 className="font-syne text-heading text-sm font-semibold">
                    {section.title}
                  </h4>
                </div>
                <ol className="flex flex-col gap-2">
                  {section.steps.map((step, j) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="text-status-pending-text bg-status-pending-bg mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {j + 1}
                      </span>
                      <p className="text-text text-sm leading-relaxed">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-gray-border shrink-0 border-t px-6 py-4">
          <a
            href="https://chat.whatsapp.com/GjMvQOIbO9qAFjUGR3ZYVK?s=sw&p=i&mlu=2"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-80"
          >
            <MessageCircle size={16} />
            Still need help? Chat on WhatsApp
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// === Page
export default function AgentHelpPage() {
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

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

        <motion.button
          type="button"
          onClick={() => setGuideOpen(true)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border-gray-border flex cursor-pointer items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-all duration-300 ease-in-out hover:shadow-md"
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
        </motion.button>
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

      {/* Agent Guide Modal */}
      <AnimatePresence>
        {guideOpen && <AgentGuideModal onClose={() => setGuideOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
