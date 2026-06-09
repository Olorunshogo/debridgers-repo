# Session Progress

## Goal

Continue the repo-wide UI cleanup that replaces static inline CSS variable styling with token-based utility classes or clean conditional class maps.

## Working rules

- Keep dynamic or library-driven styles only where class replacement is not practical.
- Prefer token utility classes like `text-heading`, `text-text`, `bg-primary`, `bg-bg-light`, `border-gray-border`.
- Prefer conditional class maps over inline `style` for status, active, selected, and tab states when practical.
- Keep changes minimal and consistent with existing patterns.

## Completed in this session

### Dashboards

- Shared dashboard shell cleaned
- Agent dashboard cleaned
- Admin dashboard cleaned
- Buyer dashboard partially cleaned further in this session

### App-level components and routes cleaned in this session

- `apps/debridgers-frontend/app/components/FileUploadField.tsx`
- `apps/debridgers-frontend/app/components/auth/AuthSuccessModal.tsx`
- `apps/debridgers-frontend/app/components/landing/Header.tsx`
- `apps/debridgers-frontend/app/components/landing/HeroSection.tsx`
- `apps/debridgers-frontend/app/components/landing/HydrationAnimationOverlay.tsx`
- `apps/debridgers-frontend/app/routes/auth/login.tsx`
- `apps/debridgers-frontend/app/routes/auth/verify-email.tsx`
- `apps/debridgers-frontend/app/routes/dashboards/buyer/checkout.tsx`
- `apps/debridgers-frontend/app/routes/dashboards/buyer/help.tsx`
- `apps/debridgers-frontend/app/routes/dashboards/buyer/notifications.tsx`
- `apps/debridgers-frontend/app/routes/dashboards/buyer/orders.tsx`
- `apps/debridgers-frontend/app/routes/dashboards/buyer/overview.tsx`
- `apps/debridgers-frontend/app/routes/dashboards/buyer/settings.tsx`
- `apps/debridgers-frontend/app/routes/dashboards/buyer/wallet.tsx`
- `apps/debridgers-frontend/app/styles.css`

### Shared package cleanup started

- `packages/ui-web/src/components/primary-link.tsx`
- `packages/ui-web/src/components/secondary-link.tsx`
- `packages/ui-web/src/components/base-input-field.tsx`
- `packages/ui-web/src/components/dash-email-input.tsx`
- `packages/ui-web/src/components/dash-text-input.tsx`
- `packages/ui-web/src/components/dash-number-input.tsx`
- `packages/ui-web/src/components/dash-date-input.tsx`
- `packages/ui-web/src/components/dash-password-input.tsx`
- `packages/ui-app/src/components/mobile-button.tsx`

## Status after completion

Shared package form/search controls were finished, the remaining shared UI inputs were cleaned repo-wide where the inline CSS variable usage was still static, and component-level semantic spacing utilities were normalized to Tailwind's numeric scale while preserving layout tokens.

### Finished in the final cleanup pass

- `packages/ui-web/src/components/dash-select-input.tsx`
- `packages/ui-web/src/components/dash-textarea-input.tsx`
- `packages/ui-web/src/components/dash-search-input.tsx`
- `packages/ui-web/src/components/dash-select.tsx`
- `packages/ui-web/src/components/dash-switch-input.tsx`
- `packages/ui-web/src/components/email-input.tsx`
- `packages/ui-web/src/components/text-input.tsx`
- `packages/ui-web/src/components/textarea-input.tsx`
- `packages/ui-web/src/components/whatsapp-button.tsx`
- `apps/debridgers-frontend/app/routes/dashboards/agent/overview.tsx` progress bar token cleanup
- `packages/ui-web/src/components/submit-button.tsx`
- `apps/debridgers-frontend/app/components/landing/Footer.tsx` spacing normalization
- `apps/debridgers-frontend/app/components/landing/HeroSection.tsx` spacing normalization
- `apps/debridgers-frontend/app/routes/landing/home.tsx` spacing normalization
- `apps/debridgers-frontend/app/routes/landing/agents.tsx` sticky offset normalization
- `apps/debridgers-frontend/app/routes/landing/contact.tsx` sticky offset normalization

## Intentional leftovers after final audit

These remain because they are library-driven, animation-driven, decorative, or layout-driven rather than static token misuse:

- Recharts color and tooltip config in:
  - `apps/debridgers-frontend/app/routes/dashboards/agent/overview.tsx`
  - `apps/debridgers-frontend/app/routes/dashboards/buyer/overview.tsx`
- `style={{ order: ... }}` in `apps/debridgers-frontend/app/routes/dashboards/agent/leaderboard.tsx`
- `color-mix(...)` decorative borders in:
  - `apps/debridgers-frontend/app/routes/dashboards/shared/HeroGreetingCard.tsx`
  - `apps/debridgers-frontend/app/routes/landing/home.tsx`
- animation/layout styles in:
  - `apps/debridgers-frontend/app/components/landing/Footer.tsx`
  - `apps/debridgers-frontend/app/components/landing/IntroAnimation.tsx`
  - `apps/debridgers-frontend/app/routes/landing/home.tsx`
  - `apps/debridgers-frontend/app/routes/dashboards/buyer/help.tsx` modal max height
- `libs/shared-theme/src/index.ts` exporting CSS var references is expected and should likely stay as a token source

## Validation status after final cleanup

- `packages/ui-web/src/components/**/*.tsx` audit for `var(--` returned no matches.
- `packages/ui-web/src/components/**/*.tsx` audit for `style={{` returned no matches.
- App/package audit for semantic component spacing classes now only returns intentional layout-token false positives such as `px-section-px-sm` and `py-section-py-lg`, plus standard Tailwind size classes like `max-w-md`/`max-w-sm` that match the suffix regex but are not semantic spacing-token usages.
- Repo-wide `var(--` matches are now limited to intentional token sources, Recharts config, and decorative `color-mix(...)` usage.
- Repo-wide `style={{` matches are now limited to intentional animation/layout/decorative cases and dynamic width/order/max-height usage.
- Diagnostics summary no longer showed actionable cleanup errors from this pass; remaining warnings were outside the cleanup scope, plus one stale class-order warning reported against `dash-switch-input.tsx` even after the class was updated to `translate-x-5.5`.

## If revisiting later

Ask the agent to:

1. Read `.zed/session-progress.md`
2. Re-run repo-wide grep for `var(--` and `style={{`
3. Verify remaining matches are still intentional after any new UI work
4. Ignore token-source files like `apps/debridgers-frontend/app/styles.css` and `libs/shared-theme/src/index.ts` unless the theme architecture itself is changing
