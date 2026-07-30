# Tailwind v4 Shared Theme - How to Use

## The Big Picture

```
tokens.css  →  styles.css (@theme)  →  Tailwind utility classes
```

- `libs/shared-theme/src/tokens.css` - raw CSS variables. **Source of truth.** Edit here first.
- `apps/debridgers-frontend/app/styles.css` - maps those vars into Tailwind via `@theme inline`, and defines app-specific layout tokens.
- `libs/shared-theme/src/index.ts` - JS/TS colour and shadow exports that reference the same CSS vars. Use in inline styles or non-Tailwind code.

> `tailwind.config.ts` has been deleted. Tailwind v4 is configured entirely through CSS (`@theme` in `styles.css`). There is no JS config file.

---

## Spacing

Two systems are available and can be mixed freely:

**1. Tailwind's built-in numeric scale** (unchanged, always available)

| Value | Tailwind class                |
| ----- | ----------------------------- |
| 4px   | `gap-1` / `p-1` / `mt-1` etc. |
| 8px   | `gap-2` / `p-2`               |
| 12px  | `gap-3` / `p-3`               |
| 16px  | `gap-4` / `p-4`               |
| 20px  | `gap-5` / `p-5`               |
| 24px  | `gap-6` / `p-6`               |
| 32px  | `gap-8` / `p-8`               |
| 40px  | `gap-10` / `p-10`             |

**2. Named semantic spacing tokens** (defined in `styles.css @theme`)

| Token            | Value | Tailwind class                    |
| ---------------- | ----- | --------------------------------- |
| `--spacing-xs`   | 4px   | `gap-xs` / `p-xs` / `mt-xs` etc.  |
| `--spacing-sm`   | 8px   | `gap-sm` / `p-sm` / `mt-sm`       |
| `--spacing-md`   | 12px  | `gap-md` / `p-md` / `mt-md`       |
| `--spacing-base` | 16px  | `gap-base` / `p-base` / `mt-base` |
| `--spacing-lg`   | 20px  | `gap-lg` / `p-lg` / `mt-lg`       |
| `--spacing-xl`   | 24px  | `gap-xl` / `p-xl` / `mt-xl`       |
| `--spacing-2xl`  | 32px  | `gap-2xl` / `p-2xl` / `mt-2xl`    |
| `--spacing-3xl`  | 40px  | `gap-3xl` / `p-3xl` / `mt-3xl`    |
| `--spacing-4xl`  | 48px  | `gap-4xl` / `p-4xl` / `mt-4xl`    |
| `--spacing-5xl`  | 64px  | `gap-5xl` / `p-5xl` / `mt-5xl`    |

```tsx
<div className="flex gap-4" />          // canonical component spacing
<div className="flex flex-col gap-6" />
<div className="px-6 py-4" />
<div className="mt-16" />
<div className="px-section-px py-section-py" /> // keep semantic layout tokens
```

The named tokens still work on every spacing utility: `gap`, `p`, `m`, `top`, `left`, `w`, `h`, etc. But in app/component code, prefer Tailwind's numeric spacing scale for generic padding and margin. Keep semantic spacing tokens for named layout contracts like `section-*` and `navbar-h`.

---

## Typography

Headings use a **fluid clamp-based scale** defined in `@theme`. These scale automatically between mobile and desktop - no breakpoint classes needed.

| Token            | Class          | Range       | Use for                       |
| ---------------- | -------------- | ----------- | ----------------------------- |
| `--text-hero`    | `text-hero`    | 48px → 72px | Hero section h1               |
| `--text-h1`      | `text-h1`      | 28px → 60px | Page-level h1                 |
| `--text-h2`      | `text-h2`      | 24px → 48px | Section headings              |
| `--text-h3`      | `text-h3`      | 20px → 32px | Card / subsection headings    |
| `--text-h4`      | `text-h4`      | 18px → 24px | Minor headings                |
| `--text-h5`      | `text-h5`      | 16px → 20px | Small headings                |
| `--text-h6`      | `text-h6`      | 14px → 16px | Labels / captions as headings |
| `--text-body-lg` | `text-body-lg` | 16px → 20px | Lead paragraphs / subtexts    |
| `--text-body-sm` | `text-body-sm` | 14px fixed  | Secondary body text           |

```tsx
<h1 className="font-syne font-bold text-hero text-white">Market Prices.</h1>
<h2 className="font-syne font-bold text-h2 text-primary">Everything you spend on.</h2>
<h3 className="font-syne font-bold text-h3">Send us your order</h3>
<p className="text-body-lg text-white">Fresh foodstuff delivered...</p>
```

> Do NOT write `text-3xl sm:text-5xl lg:text-7xl` on headings. Use the semantic token - it handles fluid scaling for you.

> `h1` through `h6` elements automatically get `font-family: "Syne"` from `@layer base`. You only need `font-syne` if overriding inside a component where the heading tag isn't used.

For body copy that doesn't need to scale, Tailwind's standard text utilities are fine:

```tsx
<p className="text-sm" />    // 14px
<p className="text-base" />  // 16px
<p className="text-lg" />    // 18px
```

---

## Colours

All colour tokens live in `tokens.css` and are mapped to Tailwind classes via `@theme inline` in `styles.css`.

### Brand

| CSS var (tokens.css)      | Tailwind prefix   | Hex       | Example classes                              |
| ------------------------- | ----------------- | --------- | -------------------------------------------- |
| `--primary-color`         | `primary`         | `#1e5925` | `bg-primary` `text-primary` `border-primary` |
| `--primary-color-light`   | `primary-light`   | `#4b7a51` | `bg-primary-light` `text-primary-light`      |
| `--secondary-color`       | `secondary`       | `#ef9e0b` | `bg-secondary` `text-secondary`              |
| `--secondary-color-light` | `secondary-light` | `#fef3c7` | `bg-secondary-light`                         |

### Base

| CSS var   | Tailwind prefix | Hex       | Example classes         |
| --------- | --------------- | --------- | ----------------------- |
| `--white` | `white`         | `#ffffff` | `bg-white` `text-white` |
| `--black` | `black`         | `#000000` | `bg-black` `text-black` |

### Headings

| CSS var             | Tailwind prefix | Hex       | Example classes |
| ------------------- | --------------- | --------- | --------------- |
| `--heading-colour`  | `heading`       | `#111827` | `text-heading`  |
| `--heading-colour2` | `heading2`      | `#010a12` | `text-heading2` |

### Text

| CSS var              | Tailwind prefix    | Hex       | Example classes         |
| -------------------- | ------------------ | --------- | ----------------------- |
| `--text-colour`      | `text`             | `#414652` | `text-text`             |
| `--text-colour2`     | `text2`            | `#a5bda8` | `text-text2`            |
| `--text-placeholder` | `text-placeholder` | `#969393` | `text-text-placeholder` |

### Status

| CSS var            | Tailwind prefix  | Hex       | Example classes                 |
| ------------------ | ---------------- | --------- | ------------------------------- |
| `--good-green`     | `good-green`     | `#07ff07` | `text-good-green`               |
| `--error-red`      | `error-red`      | `#ff0707` | `text-error-red` `bg-error-red` |
| `--warning-yellow` | `warning-yellow` | `#fffb01` | `text-warning-yellow`           |

### Backgrounds

| CSS var      | Tailwind prefix | Hex       | Example classes |
| ------------ | --------------- | --------- | --------------- |
| `--bg-gray`  | `bg-gray`       | `#f5f5f5` | `bg-bg-gray`    |
| `--bg-light` | `bg-light`      | `#f4f7f5` | `bg-bg-light`   |

### Borders

| CSS var         | Tailwind prefix | Hex       | Example classes      |
| --------------- | --------------- | --------- | -------------------- |
| `--border-gray` | `border-gray`   | `#d9d9d9` | `border-border-gray` |

> All `*` elements get `border-color: var(--border-gray)` by default from `@layer base`. You only need `border-border-gray` to be explicit or to override.

### Icons

| CSS var            | Tailwind prefix  | Hex       | Example classes       |
| ------------------ | ---------------- | --------- | --------------------- |
| `--icon-primary`   | `icon-primary`   | `#1e1e1e` | `text-icon-primary`   |
| `--icon-secondary` | `icon-secondary` | `#757575` | `text-icon-secondary` |
| `--icon-tertiary`  | `icon-tertiary`  | `#b3b3b3` | `text-icon-tertiary`  |

### Dashboard - Status Badges

These are used for order/account status chips.

| CSS var                    | Tailwind prefix          | Use                           |
| -------------------------- | ------------------------ | ----------------------------- |
| `--status-on-the-way-bg`   | `status-on-the-way-bg`   | `bg-status-on-the-way-bg`     |
| `--status-on-the-way-text` | `status-on-the-way-text` | `text-status-on-the-way-text` |
| `--status-delivered-bg`    | `status-delivered-bg`    | `bg-status-delivered-bg`      |
| `--status-delivered-text`  | `status-delivered-text`  | `text-status-delivered-text`  |
| `--status-cancelled-bg`    | `status-cancelled-bg`    | `bg-status-cancelled-bg`      |
| `--status-cancelled-text`  | `status-cancelled-text`  | `text-status-cancelled-text`  |
| `--status-active-bg`       | `status-active-bg`       | `bg-status-active-bg`         |
| `--status-active-text`     | `status-active-text`     | `text-status-active-text`     |
| `--status-pending-bg`      | `status-pending-bg`      | `bg-status-pending-bg`        |
| `--status-pending-text`    | `status-pending-text`    | `text-status-pending-text`    |

```tsx
<span className="bg-status-delivered-bg text-status-delivered-text rounded-full px-3 py-1">
  Delivered
</span>
```

### Dashboard - UI

| CSS var                     | Tailwind prefix           | Use                          |
| --------------------------- | ------------------------- | ---------------------------- |
| `--dash-quick-action-hover` | `dash-quick-action-hover` | `bg-dash-quick-action-hover` |
| `--dash-sidebar-bg`         | `dash-sidebar-bg`         | `bg-dash-sidebar-bg`         |
| `--dash-topbar-bg`          | `dash-topbar-bg`          | `bg-dash-topbar-bg`          |
| `--dash-page-bg`            | `dash-page-bg`            | `bg-dash-page-bg`            |

### Shadows

| CSS var           | Tailwind class  | Value                                   |
| ----------------- | --------------- | --------------------------------------- |
| `--shadow-yellow` | `shadow-yellow` | `0 4px 50px 10px rgba(148, 97, 4, 0.5)` |

```tsx
<div className="shadow-yellow" />
```

### Input tokens

`--input-border`, `--input-border-focus`, `--input-error-red`, and `--input-bg`
are now mapped in `@theme inline` (`styles.css`), so they generate Tailwind
color classes like any other token. `--input-radius` is the one remaining
CSS-var-only token - there's no `--radius-*` mapping for it, so it has no
Tailwind utility class.

| CSS var                | Value     | Tailwind class(es)                                            |
| ---------------------- | --------- | ------------------------------------------------------------- |
| `--input-border`       | `#d1d5db` | `border-input-border` `text-input-border` `bg-input-border`   |
| `--input-border-focus` | `#1a4a2e` | `border-input-border-focus` `focus:border-input-border-focus` |
| `--input-error-red`    | `#ef4444` | `border-input-error-red` `text-input-error-red`               |
| `--input-bg`           | `#ffffff` | `bg-input-bg`                                                 |
| `--input-radius`       | `0.5rem`  | CSS-var only - no Tailwind class                              |

```tsx
<input className="border-input-border bg-input-bg focus:border-input-border-focus" />
<input className="border-input-error-red" /> // error state

// input-radius is still CSS-var-only
<input style={{ borderRadius: "var(--input-radius)" }} />
```

### Usage examples

```tsx
<div className="bg-primary text-white" />
<span className="text-secondary font-bold" />
<div className="border border-border-gray bg-bg-gray" />
<p className="text-text" />
<p className="text-text2 text-sm" />
<span className="text-error-red" />
```

For inline styles (when you need opacity modifiers or dynamic values):

```tsx
<div style={{ backgroundColor: "var(--primary-color)" }} />
<div style={{ color: "var(--secondary-color)" }} />
```

---

## Fonts

Two fonts are in use: **Syne** (headings) and **Open Sans** (body).

```tsx
<h1 className="font-syne font-bold" />    // headings
<p className="font-open-sans" />          // body text
```

> `h1` through `h6` elements automatically receive `font-family: "Syne"` from `@layer base` - you only need `font-syne` on non-heading elements or when overriding.

> A `font-openSans` utility also exists in `@layer utilities` (camelCase, with `!important`). Prefer `font-open-sans` (from `@theme`) in normal usage. `font-openSans` is the override version.

---

## Layout Tokens

`--navbar-h` is defined in both `tokens.css` (as `74px`) and overridden in `styles.css :root` (as `4.75rem`). The `styles.css` value wins. All section padding tokens are app-specific and live only in `styles.css :root`.

All layout tokens are mapped in `@theme inline` as `--spacing-*` so they work as spacing utilities.

| CSS var           | Tailwind class               | Value   |
| ----------------- | ---------------------------- | ------- |
| `--navbar-h`      | `h-navbar-h` / `mt-navbar-h` | 4.75rem |
| `--section-px`    | `px-section-px`              | 1rem    |
| `--section-px-sm` | `px-section-px-sm`           | 2.5rem  |
| `--section-px-lg` | `px-section-px-lg`           | 6.25rem |
| `--section-py`    | `py-section-py`              | 2rem    |
| `--section-py-sm` | `py-section-py-sm`           | 4rem    |
| `--section-py-lg` | `py-section-py-lg`           | 6.25rem |

```tsx
// Standard section padding pattern
<section className="py-section-py sm:py-section-py-sm lg:py-section-py-lg px-section-px sm:px-section-px-sm lg:px-section-px-lg" />

// Offset a full-bleed element below the fixed navbar
<div className="-mt-navbar-h" />

// Spacer equal to the navbar height
<div className="h-navbar-h" />
```

---

## Component Classes (`@layer components`)

Three reusable max-width container classes are defined in `styles.css`.

| Class                  | Equivalent                 | Use                                    |
| ---------------------- | -------------------------- | -------------------------------------- |
| `.landing-max-width`   | `mx-auto w-full max-w-350` | Default landing page content container |
| `.layout-max-width`    | `mx-auto w-full max-w-500` | Wider full-page layout wrapper         |
| `.dashboard-max-width` | `mx-auto w-full max-w-355` | Dashboard content container            |

```tsx
<div className="landing-max-width px-section-px sm:px-section-px-sm lg:px-section-px-lg" />
<main className="layout-max-width" />
<div className="dashboard-max-width" />
```

---

## Global Base Styles (`@layer base`)

These are applied globally and you don't need to add them manually.

| What                                 | Applied to         | Details                                   |
| ------------------------------------ | ------------------ | ----------------------------------------- |
| `box-sizing: border-box`             | all elements       | Standard box model                        |
| `border-color: var(--border-gray)`   | all elements       | Default border colour on every element    |
| `scroll-behavior: smooth`            | `html`             | Smooth anchor scrolling                   |
| `font-family: "Syne"`                | `h1` through `h6`  | All heading tags auto-use Syne            |
| `background: var(--white)`           | `body`             | Default page background                   |
| `color: var(--text-colour)`          | `body`             | Default text colour                       |
| `bg-gray-950` + `color-scheme: dark` | `body` (dark mode) | Applied when `prefers-color-scheme: dark` |

**Autofill override**: Chrome/Safari autofill background is forced to `var(--white)` with `var(--text-colour)` text. Autofill won't show the browser's default yellow/blue tint.

**Number input arrows**: The browser-native up/down arrows on `<input type="number">` are hidden globally (both WebKit and Firefox).

**Scrollbar**: Globally styled to be thin (5px), transparent track, semi-transparent white thumb. The white thumb works well over dark backgrounds (landing page, dark sections). Over light backgrounds it becomes nearly invisible - override per-component if needed.

```tsx
// No special class needed - just use standard border/bg/text:
<div className="border" />             // uses var(--border-gray) automatically
<body />                               // already bg-white text-text
<h2>Section Title</h2>                // already font-syne
```

---

## Using the JS/TS Exports

```ts
import { colors, shadows } from "@debridgers/shared-theme";

// inline styles
<div style={{ backgroundColor: colors.primary }} />
<div style={{ color: colors.secondary }} />
<div style={{ boxShadow: shadows.yellow }} />
```

Available exports:

```ts
colors.primary; // "var(--primary-color)"
colors.primaryLight; // "var(--primary-color-light)"
colors.secondary; // "var(--secondary-color)"
colors.secondaryLight; // "var(--secondary-color-light)"
colors.white; // "var(--white)"
colors.black; // "var(--black)"
colors.headingColour; // "var(--heading-colour)"
colors.headingColour2; // "var(--heading-colour2)"
colors.textColour; // "var(--text-colour)"
colors.textColour2; // "var(--text-colour2)"
colors.textPlaceholder; // "var(--text-placeholder)"
colors.goodGreen; // "var(--good-green)"
colors.errorRed; // "var(--error-red)"
colors.warningYellow; // "var(--warning-yellow)"
colors.bgGray; // "var(--bg-gray)"
colors.bgLight; // "var(--bg-light)"
colors.borderGray; // "var(--border-gray)"
colors.iconPrimary; // "var(--icon-primary)"
colors.iconSecondary; // "var(--icon-secondary)"
colors.iconTertiary; // "var(--icon-tertiary)"
shadows.yellow; // "var(--shadow-yellow)"
```

---

## Adding a New Token

1. Add the raw CSS var to `tokens.css`:

```css
:root {
  --brand-teal: #0d9488;
}
```

2. Map it in `@theme inline` inside `styles.css`:

```css
@theme inline {
  --color-brand-teal: var(--brand-teal);
}
```

3. Use it as a Tailwind class:

```tsx
<div className="bg-brand-teal text-brand-teal" />
```

4. Optionally export it from `index.ts` for JS/TS use:

```ts
export const colors = {
  brandTeal: "var(--brand-teal)",
  // ...
};
```

> For spacing tokens, map as `--spacing-*` in `@theme inline`:
>
> ```css
> --spacing-page-gutter: 1.5rem;
> ```
>
> Then use as `px-page-gutter`, `mx-page-gutter`, etc.

> For app-specific layout vars (navbar height, section padding), define in `styles.css :root` rather than `tokens.css`. Tokens.css is shared across all apps; styles.css is frontend-specific.

---

## Rules Going Forward

- Never hardcode hex values in components - always use a CSS var or Tailwind token class.
- Use Tailwind's numeric spacing scale for generic component padding and margin (`p-4`, `px-6`, `mt-8`). Keep semantic layout tokens only for named layout contracts like `px-section-px`, `py-section-py`, and `mt-navbar-h`.
- Use semantic typography tokens (`text-hero`, `text-h2`, etc.) for headings - never write responsive chains like `text-3xl sm:text-5xl lg:text-7xl`.
- Add new shared tokens to `tokens.css` first, then map in `styles.css @theme`.
- App-specific layout vars (navbar height, section padding) stay in `styles.css :root`.
- Input tokens (`--input-border`, `--input-border-focus`, etc.) are CSS-var-only - use them directly, not via Tailwind classes.

---

## Common Gotchas

| Problem                                     | Fix                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Heading looks too small on mobile           | Use `text-hero` / `text-h2` etc. - they clamp automatically               |
| Named spacing class not working             | Check `@theme inline` in `styles.css` has the `--spacing-*` mapping       |
| Color not applying                          | Check `@theme inline` in `styles.css` has the `--color-*` mapping         |
| Input token not available as Tailwind class | Only `--input-radius` is CSS-var-only now; the rest have Tailwind classes |
| Font not loading                            | `@import url(...)` must be before `@import "tailwindcss"`                 |
| `tailwind.config.ts` missing                | Intentionally deleted - v4 uses `@theme` in CSS only                      |
| Autofill shows blue/yellow tint             | Handled globally in `@layer base` - no extra class needed                 |
| Number input arrows showing                 | Handled globally - no extra class needed                                  |
| Scrollbar too wide or themed wrong          | Override `scrollbar-width` / `scrollbar-color` in the component           |
| Dark mode not applying                      | It uses `prefers-color-scheme: dark` - system-level, not a class          |
