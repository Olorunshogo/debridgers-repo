/**
 * shared-theme/index.ts
 *
 * Single source of truth for design tokens — values mirror tokens.css.
 * Use these in JS/TS contexts (e.g. inline styles, tests, non-Tailwind code).
 * For Tailwind usage, rely on the CSS variable classes defined via @theme in styles.css.
 */

export const colors = {
  // Brand
  primary: "var(--primary-color)",
  primaryLight: "var(--primary-color-light)",
  secondary: "var(--secondary-color)",
  secondaryLight: "var(--secondary-color-light)",

  // Base
  white: "var(--white)",
  black: "var(--black)",

  // Headings
  headingColour: "var(--heading-colour)",
  headingColour2: "var(--heading-colour2)",

  // Text
  textColour: "var(--text-colour)",
  textColour2: "var(--text-colour2)",
  textPlaceholder: "var(--text-placeholder)",

  // Status
  goodGreen: "var(--good-green)",
  errorRed: "var(--error-red)",
  warningYellow: "var(--warning-yellow)",

  // Backgrounds
  bgGray: "var(--bg-gray)",
  bgLight: "var(--bg-light)",

  // Borders
  borderGray: "var(--border-gray)",

  // Icons
  iconPrimary: "var(--icon-primary)",
  iconSecondary: "var(--icon-secondary)",
  iconTertiary: "var(--icon-tertiary)",
} as const;

export const spacing = {
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  base: "var(--space-base)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
  "2xl": "var(--space-2xl)",
  "3xl": "var(--space-3xl)",
  "4xl": "var(--space-4xl)",
} as const;

export const shadows = {
  yellow: "var(--shadow-yellow)",
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Shadows = typeof shadows;

// Tailwind preset — consumed by apps/*/tailwind.config.ts
const preset = {
  theme: {
    extend: {
      colors: {
        // Brand
        primary: "var(--primary-color)",
        "primary-light": "var(--primary-color-light)",
        secondary: "var(--secondary-color)",
        "secondary-light": "var(--secondary-color-light)",

        // Base
        white: "var(--white)",
        black: "var(--black)",

        // Headings
        "heading-colour": "var(--heading-colour)",
        "heading-colour2": "var(--heading-colour2)",

        // Text
        "text-colour": "var(--text-colour)",
        "text-colour2": "var(--text-colour2)",
        "text-placeholder": "var(--text-placeholder)",

        // Status
        "good-green": "var(--good-green)",
        "error-red": "var(--error-red)",
        "warning-yellow": "var(--warning-yellow)",

        // Backgrounds
        "bg-gray": "var(--bg-gray)",
        "bg-light": "var(--bg-light)",

        // Borders
        "border-gray": "var(--border-gray)",

        // Input
        "input-border": "var(--input-border)",
        "input-border-focus": "var(--input-border-focus)",
        "input-error-red": "var(--input-error-red)",
        "input-bg": "var(--input-bg)",

        // Icons
        "icon-primary": "var(--icon-primary)",
        "icon-secondary": "var(--icon-secondary)",
        "icon-tertiary": "var(--icon-tertiary)",
      },
      height: {
        "navbar-h": "var(--navbar-h)",
      },
      spacing: {
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        base: "var(--space-base)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "2xl": "var(--space-2xl)",
        "3xl": "var(--space-3xl)",
        "4xl": "var(--space-4xl)",
        "navbar-h": "var(--navbar-h)",
      },
      boxShadow: {
        yellow: "0 4px 50px 10px rgba(148, 97, 4, 0.5)",
      },
      borderRadius: {
        input: "var(--input-radius)",
      },
    },
  },
};

export default preset;
