import React from "react";
import { Link } from "react-router";
import { Icon } from "@iconify/react";

interface YellowPrimaryLinkProps {
  to: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Yellow (secondary-colour) rounded pill link using react-router <Link>.
 * Used in HeroGreetingCard actions and Weekly Payout hero.
 */
export function YellowPrimaryLink({
  to,
  icon,
  children,
  className = "",
}: YellowPrimaryLinkProps) {
  return (
    <Link
      to={to}
      className={`bg-secondary inline-flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2 text-base font-semibold text-[#FCFDFD] transition-all hover:opacity-90 lg:text-lg ${className}`}
    >
      {icon && <Icon icon={icon} className="h-4 w-4" />}
      {children}
    </Link>
  );
}
