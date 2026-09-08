/**
 * shared-theme/index.ts
 *
 * Single source of truth for design tokens - values mirror tokens.css.
 * Use these in JS/TS contexts (e.g. inline styles, tests, non-Tailwind code).
 * For Tailwind usage, rely on the CSS variable classes defined via @theme in styles.css.
 */

export const colors = {
  primary: "var(--primary-color)",
  primaryLight: "var(--primary-color-light)",
  secondary: "var(--secondary-color)",
  secondaryLight: "var(--secondary-color-light)",

  white: "var(--white)",
  black: "var(--black)",

  headingColour: "var(--heading-colour)",
  headingColour2: "var(--heading-colour2)",

  textColour: "var(--text-colour)",
  textColour2: "var(--text-colour2)",
  textPlaceholder: "var(--text-placeholder-text)",

  goodGreen: "var(--good-green)",
  errorRed: "var(--error-red)",
  warningYellow: "var(--warning-yellow)",

  bgGray: "var(--bg-gray)",
  bgLight: "var(--bg-light)",

  borderGray: "var(--border-gray)",

  iconPrimary: "var(--icon-primary)",
  iconSecondary: "var(--icon-secondary)",
  iconTertiary: "var(--icon-tertiary)",
} as const;

export const shadows = {
  yellow: "var(--shadow-yellow)",
} as const;

export type Colors = typeof colors;
export type Shadows = typeof shadows;
