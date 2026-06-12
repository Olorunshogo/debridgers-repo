import { Icon } from "@iconify/react";

interface WhatsAppButtonProps {
  label?: string;
  className?: string;
}

export function WhatsAppButton({
  label = "Order On WhatsApp",
  className,
}: WhatsAppButtonProps) {
  return (
    <a
      href="https://wa.me/+2347012288798"
      target="_blank"
      rel="noreferrer"
      className={`shadow-yellow bg-secondary inline-flex h-13.5 w-full max-w-fit items-center gap-2.5 rounded-full px-4 py-6 text-base font-semibold text-white transition-opacity sm:text-lg lg:h-18 lg:px-6 lg:py-8 lg:text-xl hover:opacity-90${className ? ` ${className}` : ""}`}
    >
      <Icon icon="cib:whatsapp" className="h-5 w-5" />
      {label}
    </a>
  );
}
