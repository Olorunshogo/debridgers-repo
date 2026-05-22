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
    { title: "Help Center | Debridgers" },
    {
      name: "description",
      content:
        "Get help with your Debridgers buyer account: FAQs, order support, and more.",
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
    question: "How do I place an order?",
    answer:
      "Go to Shop / Catalog from the sidebar, browse available products, add items to your cart, and proceed to checkout. You can pay on delivery or via bank transfer.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Delivery is typically within 24-48 hours for orders placed before 12pm. You will receive a confirmation once your order is assigned to an agent.",
  },
  {
    question: "Can I cancel or modify my order?",
    answer:
      "You can cancel an order before it is assigned to a delivery agent. Once assigned, contact support via WhatsApp to request a modification.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept cash on delivery and bank transfer. Card payments are coming soon. Your wallet balance can also be used to pay for orders.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Go to My Orders in the sidebar to see the current status of all your orders - pending, in transit, or delivered.",
  },
  {
    question: "What if I receive the wrong item or quantity?",
    answer:
      "Contact us immediately via WhatsApp with your order number and a photo of what you received. We will resolve it within 24 hours.",
  },
];

// === FAQ row
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
export default function BuyerHelpPage() {
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
            Answers to common questions for buyers
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
              Chat with our support team
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
              Buyer Guide
            </p>
            <p className="text-sm" style={{ color: "var(--text-colour)" }}>
              How ordering and delivery works
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
