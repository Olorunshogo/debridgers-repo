import React from "react";

type Props = {
  children: React.ReactNode;
};

export function MobileButton({ children }: Props) {
  return (
    <button
      style={{
        padding: 12,
        borderRadius: 8,
        background: "black",
        color: "white",
      }}
    >
      {children}
    </button>
  );
}
