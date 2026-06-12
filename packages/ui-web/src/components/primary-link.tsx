import React from "react";

interface PrimaryLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PrimaryLink({
  href,
  children,
  className,
  style,
}: PrimaryLinkProps) {
  const base =
    "bg-primary text-white inline-flex items-center justify-center gap-2.5 rounded-full px-4 py-2.5 text-base font-semibold transition-all duration-300 ease-in-out hover:opacity-90 cursor-pointer";

  return (
    <a
      href={href}
      className={className ? `${base} ${className}` : base}
      style={style}
    >
      {children}
    </a>
  );
}
