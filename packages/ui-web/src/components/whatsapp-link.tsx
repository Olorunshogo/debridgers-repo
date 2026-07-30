import { Icon } from "@iconify/react";

interface WhatsAppLinkProps {
  label?: string;
  className?: string;
  shadowYellow?: boolean;
}

export function WhatsAppLink({
  label = "Order On WhatsApp",
  className,
  shadowYellow = false,
}: WhatsAppLinkProps) {
  return (
    <a
      href="https://wa.me/+2347012288798"
      target="_blank"
      rel="noreferrer"
      className={`${shadowYellow ? "shadow-yellow" : ""} bg-secondary flex h-13.5 w-fit items-center justify-center gap-2.5 rounded-full px-4 py-6 text-base font-semibold text-white transition-opacity sm:text-lg lg:h-18 lg:px-6 lg:py-8 lg:text-xl hover:opacity-90${className ? ` ${className}` : ""}`}
    >
      <Icon icon="cib:whatsapp" className="h-5 w-5" />
      {label}
    </a>
  );
}
