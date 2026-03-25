import React from "react";
import { MessageCircle } from "lucide-react";

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
      style={{ backgroundColor: "var(--color-secondary)", color: "#fff" }}
      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90${className ? ` ${className}` : ""}`}
    >
      <MessageCircle size={18} />
      {label}
    </a>
  );
}
