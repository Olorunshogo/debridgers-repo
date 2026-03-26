export const colors = {
  // Brand
  primary: "#1a4a2e",
  secondary: "#f59e0b",
  primaryLight: "#e8f0eb",
  secondaryLight: "#fef3c7",

  // Theme
  themeOrange: "#ea4335",
  themeOrangeDash: "#ea5228",
  themeOrangeDark: "#67150e",
  themeOrangeDark2: "#1d0202",
  themeOrangeDark3: "#3c0a06",

  // Base
  white: "#ffffff",
  black: "#000000",

  // Headings
  headingBlack: "#1e1e1e",
  headingBlack2: "#010a12",
  headingDash: "#010a12",

  // Text
  textDash: "#181b19",
  textColour: "#49454f",
  textColour2: "#795d5a",
  textColour3: "#1c1c1c",
  textPlaceholder: "#969393",

  // Status
  redDash: "#ff0707",
  greenDash: "#087060",
  green2: "#27ae60",
  errorRed: "#ff383c",
  blue: "#136ce3",
  blueLight: "#04b7fe",

  // Backgrounds
  bgGray: "#f5f5f5",
  bgPink: "#fff9f8",
  bgBlue: "#f9fbff",
  bgRed: "#fff5f5",
  bgRedLight: "#faccc8",
  bgDashCard: "#fbfbfb",
  dashPinkBg: "#fff7f5",

  // Borders
  borderGray: "#d9d9d9",
  borderPink: "#c2d9c0",
  borderRed: "#edcac7",
  borderInput: "#d9d9d9",
  borderButton: "#e5d4d2",
  borderBlue: "#cfe3ff",
  borderDash: "#acacac",
  borderDashed: "#585757",

  // Icons
  iconPrimary: "#1e1e1e",
  iconSecondary: "#757575",
  iconTertiary: "#b3b3b3",
} as const;

export const spacing = {
  gapSm: "0.5rem",
  gapMd: "0.75rem",
  gapBase: "1rem",
  gapLg: "1.25rem",
  gapXl: "1.5rem",
  gap2xl: "2rem",
  gap3xl: "2.5rem",

  spaceSm: "0.5rem",
  spaceMd: "0.75rem",
  spaceBase: "1rem",
  spaceLg: "1.25rem",
  spaceXl: "1.5rem",
  space2xl: "1.75rem",
  space3xl: "2rem",
  space4xl: "2.5rem",
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
