import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface AuthSuccessModalProps {
  title: string;
  description: string;
  submitButtonText: string;
  redirectUrl: string;
}

export default function AuthSuccessModal({
  title,
  description,
  submitButtonText,
  redirectUrl,
}: AuthSuccessModalProps) {
  const navigate = useNavigate();

  function handleRedirect() {
    navigate(redirectUrl);
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
        className="flex w-full max-w-[480px] flex-col items-center gap-6 rounded-3xl bg-white px-8 py-10 text-center shadow-2xl"
      >
        <CheckCircle2 size={56} style={{ color: "var(--primary-color)" }} />

        <div className="flex flex-col gap-2">
          <h2
            className="font-syne text-2xl font-bold"
            style={{ color: "var(--heading-colour)" }}
          >
            {title}
          </h2>
          <p
            className="font-open-sans text-sm leading-relaxed"
            style={{ color: "var(--text-colour)" }}
          >
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRedirect}
          className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--primary-color)" }}
        >
          {submitButtonText}
        </button>
      </motion.div>
    </div>
  );
}
