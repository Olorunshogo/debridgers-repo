import React from "react";

interface PrimaryLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function PrimaryLink({ href, children, className }: PrimaryLinkProps) {
  const base =
    "inline-flex items-center justify-center px-5 py-2 rounded-full font-semibold text-sm transition-opacity hover:opacity-90";

  return (
    <a
      href={href}
      className={className ? `${base} ${className}` : base}
      style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
    >
      {children}
    </a>
  );
}
