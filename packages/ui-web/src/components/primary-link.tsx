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
    "inline-flex items-center justify-center px-4 py-2.5 rounded-full font-semibold gap-2.5 font-semibold text-[#FCFDFD] transition-all text-base cursor-pointer duration-300 ease-in-out hover:opacity-90";

  return (
    <a
      href={href}
      className={className ? `${base} ${className}` : base}
      style={{
        backgroundColor: "var(--color-primary)",
        color: "#fff",
        ...style,
      }}
    >
      {children}
    </a>
  );
}
