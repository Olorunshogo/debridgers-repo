import React from "react";

type Props = {
  children: React.ReactNode;
};

export function MobileButton({ children }: Props) {
  return (
    <button className="rounded-lg bg-black p-3 text-white">{children}</button>
  );
}
