export const colors = {
  primary: "#1a4a2e",
  secondary: "#f59e0b",
} as const;

export type Colors = typeof colors;

// Ready-to-inject CSS custom properties for Tailwind v4 @theme blocks
export const cssVariables = `
  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary};
`;
