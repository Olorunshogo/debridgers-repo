import React from "react";

interface SecondaryLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function SecondaryLink({
  href,
  children,
  className,
  style,
}: SecondaryLinkProps) {
  const base =
    "inline-flex items-center justify-center px-base py-2 font-syne rounded-full font-semibold text-base cursor-pointer duration-300 ease-in-out transition-all hover:opacity-90";

  return (
    <a
      href={href}
      className={className ? `${base} ${className}` : base}
      style={{
        border: "1px solid var(--color-primary)",
        color: "var(--color-primary)",
        backgroundColor: "transparent",
        ...style,
      }}
    >
      {children}
    </a>
  );
}
