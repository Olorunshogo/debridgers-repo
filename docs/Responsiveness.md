# Mobile Responsiveness

## The viewport meta bug — why fonts appeared tiny on mobile

### What was broken

The `viewport` meta tag was declared inside the root route's `meta()` function in `root.tsx`:

```tsx
// ❌ Before — viewport lived in meta()
export const meta: MetaFunction = () => [
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { title: "Debridgers | Fresh Foodstuff at Market Prices in Kaduna" },
  ...
];
```

In React Router v7, every child route can export its own `meta()` function. When it does, the framework uses **that route's meta exclusively** for the page — the root route's `meta()` is not merged in automatically. The home route (`home.tsx`) has its own `meta()` that returns only a title and description, so it overwrote the root meta entirely. The result: the rendered home page had **no `<meta name="viewport">` tag**.

Without a viewport tag, mobile browsers fall back to their default behaviour: render the page at a virtual ~980px-wide "desktop" viewport and then scale it down to fit the screen. Every font and element shrinks proportionally — text that should be `36px` displays as roughly `14px`. This is exactly why fonts appeared tiny even though the code had correct `text-4xl / sm:text-5xl / lg:text-7xl` classes.

### The fix

Move the `viewport` tag out of `meta()` and hardcode it directly inside the `Layout` function's `<head>` in `root.tsx`. The `Layout` component wraps every page and is never overridden by child routes, so the tag is guaranteed to be present everywhere.

```tsx
// ✅ After — viewport lives directly in <head>
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta /> {/* child-route meta goes here */}
        <Links />
      </head>
      ...
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` and `<head>` was also added at the same time to silence React hydration mismatches caused by Vite's dev-server injecting HMR style/script tags into `<head>` that aren't part of the component tree.

### Rule of thumb

Any meta tag that must be present on **every** page (viewport, charset, robots, OG site-wide tags) belongs in the `Layout` component's `<head>`, not in a route's `meta()` export. Route-level `meta()` is for page-specific data: title, description, OG per-page tags.

## Template

📌 ORDER FORMAT

Please place your orders using this format:

Name:
Location:
Phone Number:

Items Needed:

- Beans: \_\_\_ kg
- Yam: \_\_\_ tubers
- Rice: \_\_\_ kg
- Garri: \_\_\_ kg
- Other items: \_\_\_

Preferred Delivery Date:
Payment Method:

Example:

Name: John Musa
Location: Maiduguri
Phone Number: 080xxxxxxx

Items Needed:

- Beans: 10 kg
- Yam: 5 tubers
- Rice: 25 kg

Preferred Delivery Date: 10 June 2026
Payment Method: Transfer

https://wa.me/2347012288798?text=I%20want%20to%20order%20beans%20and%20maize
