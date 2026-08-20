Do we have rate limiter for our auth? if yes, what is it? how do protect our server from ddos? Are we doing ip-listing check?

We need to manually test all the endpoints?

# Tomorrow task

Ensure Frontend is integration
Recommend: Both ✅

Why:

IP only: Attacker could try different emails from same IP → slips through
Email + IP only: Attacker could try same email from different IPs → slips through
Both: Catches both attacks:
One IP trying many emails → blocked at IP level
One email tried from many IPs → blocked at email level
Implementation:

Track two counters:

failed_attempts:IP - blocks entire IP after 5/10/11+ failures
failed_attempts:EMAIL:IP - blocks specific email+IP combo

# Update Todos

Phase 0: Clean up stray build artifacts (delete .js files from src/dist and subfolders, fix .gitignore)

Phase 1: Consolidate payment logic into api/v1/payment/ (move payment.service.ts, paystack-webhook.controller.ts, order-reconciliation.service.ts from buyer/; delete dead webhook handler code; update buyer.module.ts imports)

Phase 2: Create new api/v1/wallet/ module and move wallet services (relocate buyer/wallet.service.ts, buyer/wallet.controller.ts, agent/wallet.service.ts; create AgentLedgerService; update routes)

Phase 3: Refactor paystack-dva.service.ts to decouple API calls from DB persistence (make createDvaForUser pluggable, split into API methods and caller-managed persistence)

Phase 4: Move notifications to shared in-app module (relocate buyer/notifications to notification/features/in-app/, drop @Roles("buyer") gate, update routes to /notifications, wire into agent/admin modules)

Phase 5: Replace hardcoded role strings with USER_ROLES constants (repo-wide grep-and-replace in guards, decorators, controllers, services)

Phase 6: Event-driven login consistency (move posthog.trackLogin into UserListeners.onUserLoggedIn, add USER_LOGGED_IN emit to loginAdmin)

Phase 7: Write AGENT_DVA_PLAN.md design doc (schema migration, trigger point decision, integration with new DVA refactor)

Verification: Run pnpm typecheck:backend and pnpm lint:backend (catch import breakage from module moves)

Verification: Run pnpm --filter @debridgers/debridgers-backend test (e2e suite covering wallet-payment, webhook, order-lifecycle)

Verification: Manually test buyer checkout flow (wallet debit + Paystack init paths) and agent payout request locally

Final: Check frontend for hardcoded references to old routes (especially buyer/notifications → notifications path change); commit all changes
