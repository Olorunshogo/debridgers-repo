1. implement PostHog
   using npx -y @posthog/wizard@latest
   PostHog can do a lot more than basic analytics. The main things are:

Product analytics: events, funnels, retention, paths, cohorts, dashboards
Session replay: watch real user sessions to see where people get stuck
Autocapture: automatically track clicks, page views, form interactions, and other UI events
Feature flags: turn features on/off for specific users or segments
Experiments: run A/B tests and compare conversion or engagement
Surveys: ask users questions in-app
Heatmaps: see where users click and interact most
User profiles: tie events to individual users or accounts
Alerts and insights: detect spikes, drops, or unusual behavior
Data warehouse / SQL-style analysis: deeper custom queries on event data

2. Db for agents:
   reg:
   full name, state (Kaduna only for now), phone no, Area (in kaduna), email, password and comfirm password, then it will be sent to admin for approval or rejection.
3. Contact page is:
   fullname, email, and Message
   and we need to save name and email for campaign marketing

Quick explanation before we start:

Stock & Inventory — this is Mode 2 where agents request beans stock from Debridgers, sell themselves, then remit money back. It needs the agent wallet to exist first so the system knows what they owe and earn. No wallet = can't track it properly.
Referral commission cron job — the monthly auto-calculation that pays 5% of a recruited agent's earnings to whoever recruited them. The product doc puts this in Phase 4, it's not needed to launch.
Rider app — a completely separate mobile app for delivery riders. Phase 5, ignore it for now.
