import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  Package,
  ShoppingCart,
  Truck,
  UserCircle,
  Wallet,
  X,
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

interface GuideSection {
  icon: React.ReactNode;
  title: string;
  steps: string[];
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

const guideSections: GuideSection[] = [
  {
    icon: <UserCircle size={18} />,
    title: "Getting Started",
    steps: [
      "Log in with your registered phone number or email.",
      "Add or confirm your delivery address from your profile settings.",
      "Use the sidebar to navigate between the catalog, orders, and wallet.",
    ],
  },
  {
    icon: <ShoppingCart size={18} />,
    title: "Browsing & Adding to Cart",
    steps: [
      "Open Shop / Catalog from the sidebar to see all available products.",
      "Tap any product to view details, pricing, and available quantities.",
      "Select the quantity you need and tap Add to Cart.",
      "Continue shopping or tap the cart icon to review your items before checkout.",
    ],
  },
  {
    icon: <Package size={18} />,
    title: "Placing an Order",
    steps: [
      "From your cart, confirm the items and quantities are correct.",
      "Choose your delivery address or add a new one.",
      "Select your preferred payment method: cash on delivery, bank transfer, or wallet balance.",
      "Tap Place Order. You will receive an on-screen confirmation with your order number.",
    ],
  },
  {
    icon: <Wallet size={18} />,
    title: "Payment Methods",
    steps: [
      "Cash on Delivery: pay the delivery agent when your order arrives.",
      "Bank Transfer: transfer the exact order amount to our account before dispatch.",
      "Wallet Balance: top up your wallet and deduct directly at checkout, with no need to pay on arrival.",
      "Card payments are coming soon.",
    ],
  },
  {
    icon: <Truck size={18} />,
    title: "Delivery & Order Statuses",
    steps: [
      "Pending: your order has been received and is awaiting assignment.",
      "In Transit: a delivery agent has been assigned and is on the way.",
      "Delivered: your order has been successfully received.",
      "Orders placed before 12pm are typically delivered within 24 hours.",
      "Track your order anytime from My Orders in the sidebar.",
    ],
  },
  {
    icon: <AlertCircle size={18} />,
    title: "Reporting a Problem",
    steps: [
      "For wrong items or missing quantities, contact support on WhatsApp immediately.",
      "Include your order number and a clear photo of what you received.",
      "To cancel, go to My Orders and tap Cancel. This option is only available before an agent is assigned.",
      "All reported issues are resolved within 24 hours.",
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

// === Buyer Guide Modal
function BuyerGuideModal({ onClose }: { onClose: () => void }) {
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
              <h3 className="font-syne text-heading font-bold">Buyer Guide</h3>
              <p className="text-text text-xs">
                How ordering and delivery works
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
export default function BuyerHelpPage() {
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
            Answers to common questions for buyers
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
            <p className="text-text text-sm">Chat with our support team</p>
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
            <p className="font-syne text-heading font-semibold">Buyer Guide</p>
            <p className="text-text text-sm">How ordering and delivery works</p>
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

      {/* Buyer Guide Modal */}
      <AnimatePresence>
        {guideOpen && <BuyerGuideModal onClose={() => setGuideOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
