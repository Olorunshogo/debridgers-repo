import React from "react";
import { cn } from "../lib/utils";

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
  return (
    <a
      href={href}
      className={cn(
        "bg-primary inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full px-4 py-2.5 text-base font-semibold text-white transition-all duration-300 ease-in-out hover:opacity-90",
        className,
      )}
      style={style}
    >
      {children}
    </a>
  );
}
