# Tailwind v4 Shared Theme — How to Use

## The Big Picture

```
tokens.css  →  styles.css (@theme)  →  Tailwind utility classes
```

- `libs/shared-theme/src/tokens.css` — raw CSS variables. **Source of truth.** Edit here first.
- `apps/landing-page/app/styles.css` — maps those vars into Tailwind via `@theme inline`.
- `libs/shared-theme/src/index.ts` — JS/TS exports that reference the same CSS vars. Use in inline styles or non-Tailwind code.

---

## Spacing

One unified scale. The CSS vars are `--space-*`. In Tailwind they become `--spacing-*`, which means they work on **every**spacing utility: `gap`, `p`, `m`, `top`, `left`, `w`, `h`, etc.

| CSS var (tokens.css) | Tailwind class suffix | Value   |
| -------------------- | --------------------- | ------- |
| `--space-sm`         | `sm`                  | 0.5rem  |
| `--space-md`         | `md`                  | 0.75rem |
| `--space-base`       | `base`                | 1rem    |
| `--space-lg`         | `lg`                  | 1.25rem |
| `--space-xl`         | `xl`                  | 1.5rem  |
| `--space-2xl`        | `2xl`                 | 1.75rem |
| `--space-3xl`        | `3xl`                 | 2rem    |
| `--space-4xl`        | `4xl`                 | 2.5rem  |

```tsx
// gaps
<div className="flex gap-base" />       // 1rem
<div className="flex gap-xl" />         // 1.5rem
<div className="flex flex-col gap-sm" />

// padding / margin
<div className="px-section-px-lg py-section-py" />
<div className="mt-navbar-h" />

// arbitrary spacing with the raw var (when no @theme mapping exists)
<div className="mt-[var(--space-base)]" />
```

> Do NOT use `gap-4`, `p-4`, `mt-6` etc. Use the named tokens above so the whole codebase stays in sync.

---

## Colours

| CSS var (tokens.css)      | Tailwind class prefix | Example classes                              |
| ------------------------- | --------------------- | -------------------------------------------- |
| `--primary-color`         | `primary`             | `bg-primary` `text-primary` `border-primary` |
| `--secondary-color`       | `secondary`           | `bg-secondary` `text-secondary`              |
| `--primary-color-light`   | `primary-light`       | `bg-primary-light`                           |
| `--secondary-color-light` | `secondary-light`     | `bg-secondary-light`                         |
| `--bg-gray`               | `bg-gray`             | `bg-bg-gray`                                 |
| `--bg-light`              | `bg-light`            | `bg-bg-light`                                |
| `--text-colour`           | `text`                | `text-text`                                  |
| `--border-gray`           | `border-gray`         | `border-border-gray`                         |
| `--error-red`             | `error-red`           | `text-error-red`                             |

```tsx
<div className="bg-primary text-white" />
<span className="text-secondary font-bold" />
<div className="border border-border-gray bg-bg-gray" />
<p className="text-text" />
```

For inline styles (when you need opacity modifiers or dynamic values):

```tsx
<div style={{ backgroundColor: "var(--primary-color)" }} />
<div style={{ color: "var(--secondary-color)" }} />
```

---

## Fonts

```tsx
<h1 className="font-syne font-bold" />   // headings (also applied globally via @layer base)
<p className="font-open-sans" />         // body text
```

---

## Layout Tokens (landing-page specific)

These live in `styles.css` `:root`, not in `tokens.css` (they're app-specific).

| CSS var           | Tailwindclass                | Value   |
| ----------------- | ---------------------------- | ------- |
| `--navbar-h`      | `h-navbar-h` / `mt-navbar-h` | 4.75rem |
| `--section-px`    | `px-section-px`              | 1rem    |
| `--section-px-sm` | `px-section-px-sm`           | 1.5rem  |
| `--section-px-lg` | `px-section-px-lg`           | 2rem    |
| `--section-py`    | `py-section-py`              | 2rem    |
| `--section-py-sm` | `py-section-py-sm`           | 3rem    |
| `--section-py-lg` | `py-section-py-lg`           | 4rem    |

```tsx
<section className="py-section-py-lg px-section-px-lg" />
<div className="mt-navbar-h" />
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

---

## Using the JS/TS Exports

```ts
import { colors, spacing } from "@debridgers/shared-theme";

// inline styles
<div style={{ backgroundColor: colors.primary }} />
<div style={{ gap: spacing.xl }} />
```

---

## Rules Going Forward

- Never hardcode hex values in components — always use a CSS var or Tailwind token class.
- Never use numeric Tailwind spacing like `gap-4`, `p-6`, `mt-8` — use the named scale (`gap-base`, `p-xl`, `mt-3xl`).
- Add new shared tokens to `tokens.css` first, then map in `styles.css @theme`.
- App-specific layout vars (navbar height, section padding) stay in `styles.css :root`.

---

## Common Gotchas

| Problem                             | Fix                                                               |
| ----------------------------------- | ----------------------------------------------------------------- |
| `gap-4` not matching design         | Replace with `gap-base` (1rem) or the correct named token         |
| Color not applying                  | Check `@theme inline` in `styles.css` has the `--color-*` mapping |
| Spacing class not working           | Ensure `--spacing-*` entry exists in `@theme inline`              |
| Font not loading                    | `@import url(...)` must be before `@import "tailwindcss"`         |
| `tailwind.config.ts` preset warning | v4 uses `@theme` in CSS, not JS config — safe to ignore           |
