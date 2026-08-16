import { motion } from "framer-motion";
import { MessageCircle, type LucideIcon } from "lucide-react";
import { DialogHeader } from "../../lib/dialog/dialog-header";

// === Types

export interface HelpGuideSection {
  icon: LucideIcon;
  title: string;
  steps: string[];
}

export interface HelpGuideDialogProps {
  title: string;
  subtitle: string;
  sections: HelpGuideSection[];
  whatsAppHref: string;
  onClose: () => void;
}

// === Component

export function HelpGuideDialog({
  title,
  subtitle,
  sections,
  whatsAppHref,
  onClose,
}: HelpGuideDialogProps) {
  return (
    <div className="flex flex-col gap-5">
      <DialogHeader title={title} description={subtitle} onClose={onClose} />

      <div className="flex flex-col gap-4">
        {sections.map((section, i) => {
          const Icon = section.icon;

          return (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-gray-border flex flex-col gap-3 rounded-xl border p-4"
            >
              <div className="flex items-center gap-3">
                <span className="bg-status-pending-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                  <Icon className="text-status-pending-text h-4 w-4" />
                </span>
                <h3 className="font-syne text-heading text-sm font-semibold">
                  {section.title}
                </h3>
              </div>

              <ol className="flex flex-col gap-2">
                {section.steps.map((step, j) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="text-status-pending-text bg-status-pending-bg mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {j + 1}
                    </span>
                    <p className="text-text text-sm leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </motion.section>
          );
        })}
      </div>

      <a
        href={whatsAppHref}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
      >
        <MessageCircle className="h-4 w-4" />
        Still need help? Chat on WhatsApp
      </a>
    </div>
  );
}
