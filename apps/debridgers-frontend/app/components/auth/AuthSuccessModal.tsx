import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface AuthSuccessModalProps {
  title: string;
  description: string;
  submitButtonText: string;
  redirectUrl: string;
  navigateState?: Record<string, unknown>;
}

export default function AuthSuccessModal({
  title,
  description,
  submitButtonText,
  redirectUrl,
  navigateState,
}: AuthSuccessModalProps) {
  const navigate = useNavigate();

  function handleRedirect() {
    navigate(redirectUrl, { state: navigateState });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={handleRedirect}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-120 flex-col items-center gap-6 rounded-3xl bg-white px-8 py-10 text-center shadow-2xl"
      >
        <CheckCircle2 size={56} className="text-primary" />

        <div className="flex flex-col gap-2">
          <h2 className="font-syne text-heading text-2xl font-bold">{title}</h2>
          <p className="text-text font-open-sans text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRedirect}
          className="bg-primary w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {submitButtonText}
        </button>
      </motion.div>
    </div>
  );
}
