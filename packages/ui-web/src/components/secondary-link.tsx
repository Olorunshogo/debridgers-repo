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
    "border-primary text-primary inline-flex items-center justify-center rounded-full border bg-transparent px-4 py-2 font-syne text-base font-semibold transition-all duration-300 ease-in-out hover:opacity-90 cursor-pointer";

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
