# Tailwind v4 Shared Theme — How to Use

## The Big Picture

```
tokens.css  →  styles.css (@theme)  →  Tailwind utility classes
```

- `libs/shared-theme/src/tokens.css` — raw CSS variables. **Source of truth.** Edit here first.
- `apps/debridgers-frontend/app/styles.css` — maps those vars into Tailwind via `@theme inline`.
- `libs/shared-theme/src/index.ts` — JS/TS colour exports that reference the same CSS vars. Use in inline styles or non-Tailwind code.

> `tailwind.config.ts` has been deleted. Tailwind v4 is configured entirely through CSS (`@theme` in `styles.css`). There is no JS config file.

---

## Spacing

**Use Tailwind's default numeric scale.** The custom `--space-*` tokens and their named class aliases (`gap-4`, `p-xl`, etc.) have been removed. Use numeric classes directly.

| Value | Tailwind class                |
| ----- | ----------------------------- |
| 8px   | `gap-2` / `p-2` / `mt-2` etc. |
| 12px  | `gap-3` / `p-3`               |
| 16px  | `gap-4` / `p-4`               |
| 20px  | `gap-5` / `p-5`               |
| 24px  | `gap-6` / `p-6`               |
| 28px  | `gap-7` / `p-7`               |
| 32px  | `gap-8` / `p-8`               |
| 40px  | `gap-10` / `p-10`             |

```tsx
<div className="flex gap-4" />        // 16px
<div className="flex gap-6" />        // 24px
<div className="flex flex-col gap-2" />
<div className="px-6 py-4" />
```

The numeric scale works on **every** spacing utility: `gap`, `p`, `m`, `top`, `left`, `w`, `h`, etc.

---

## Typography

Headings use a **fluid clamp-based scale** defined in `@theme`. These scale automatically between mobile and desktop — no breakpoint classes needed.

| Token            | Class          | Range       | Use for                       |
| ---------------- | -------------- | ----------- | ----------------------------- |
| `--text-hero`    | `text-hero`    | 32px → 72px | Hero section h1               |
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

> Do NOT write `text-3xl sm:text-5xl lg:text-7xl` on headings. Use the semantic token instead — it handles the fluid scaling for you.

For body copy that doesn't need to scale, Tailwind's standard text utilities are fine:

```tsx
<p className="text-sm" />    // 14px
<p className="text-base" />  // 16px
<p className="text-lg" />    // 18px
```

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

## Layout Tokens (debridgers-frontend specific)

These live in `styles.css :root`, not in `tokens.css` (they are app-specific).

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
<section className="py-section-py sm:py-section-py-sm lg:py-section-py-lg px-section-px sm:px-section-px-sm lg:px-section-px-lg" />
<div className="-mt-navbar-h" />
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
import { colors } from "@debridgers/shared-theme";

// inline styles
<div style={{ backgroundColor: colors.primary }} />
<div style={{ color: colors.secondary }} />
```

> The `spacing` export has been removed from `index.ts` since the custom spacing scale no longer exists. Use Tailwind's numeric classes directly.

---

## Rules Going Forward

- Never hardcode hex values in components — always use a CSS var or Tailwind token class.
- Use Tailwind's numeric spacing scale (`gap-4`, `p-6`, `mt-8`). Do not invent named spacing aliases.
- Use semantic typography tokens (`text-hero`, `text-h2`, etc.) for headings — never write responsive chains like `text-3xl sm:text-5xl lg:text-7xl`.
- Add new shared tokens to `tokens.css` first, then map in `styles.css @theme`.
- App-specific layout vars (navbar height, section padding) stay in `styles.css :root`.

---

## Common Gotchas

| Problem                                    | Fix                                                               |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Heading looks too small on mobile          | Use `text-hero` / `text-h2` etc. — they clamp automatically       |
| `gap-4` / `p-xl` class not working         | Those tokens are gone — use `gap-4` / `p-6` instead               |
| Color not applying                         | Check `@theme inline` in `styles.css` has the `--color-*` mapping |
| Font not loading                           | `@import url(...)` must be before `@import "tailwindcss"`         |
| `tailwind.config.ts` missing               | Intentionally deleted — v4 uses `@theme` in CSS only              |
| `spacing` import from shared-theme missing | Removed — use Tailwind numeric classes directly                   |
