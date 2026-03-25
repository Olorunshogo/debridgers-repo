import React from "react";

interface SecondaryLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SecondaryLink({
  href,
  children,
  className,
}: SecondaryLinkProps) {
  const base =
    "inline-flex items-center justify-center px-5 py-2 rounded-full font-semibold text-sm transition-opacity hover:opacity-80";

  return (
    <a
      href={href}
      className={className ? `${base} ${className}` : base}
      style={{
        border: "1.5px solid var(--color-primary)",
        color: "var(--color-primary)",
        backgroundColor: "transparent",
      }}
    >
      {children}
    </a>
  );
}
