import React from "react";
import { Link } from "react-router";
import { isExternalHref } from "../lib/is-external-href";

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

  const classes = className ? `${base} ${className}` : base;

  /*
   * Internal paths route client-side. Using a plain <a> here reloaded the whole
   * document on every Log In / Sign Up / Order Now click, which re-downloaded
   * the app and discarded in-memory state such as the shopping cart.
   * External URLs still need a real anchor.
   */
  if (isExternalHref(href)) {
    return (
      <a href={href} className={classes} style={style}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={classes} style={style}>
      {children}
    </Link>
  );
}
