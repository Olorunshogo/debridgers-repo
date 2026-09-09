Two answers needed before I write the plan:

1. Placement
   • A (recommended): New apps/debridgers-hr (e.g. hr.debridgers.com) + Nest HR API

• B: HR section inside debridgers-admin
• C: Separate repo (not recommended)

2. First MVP slice (full prompt is months)
   • A (recommended): Recruitment vertical — jobs → public apply on marketing →
   screening → interview → offer email → create employee on accept
   • B: People ops — directory + leave + work-activity reports
   • C: Entire MVP list in one pass

Reply with e.g. 1A 2A and I’ll draft the concrete phased plan (schema, routes,
roles, Jotform later).

Done

• Recruitment: jobs → apply → screen → interview → offer → accept (applicant →
employee)
• People ops: directory, leave requests, work-activity reports
• HR admin: manage jobs/applications/offers, edit employees, review all
leave/reports
• Emails for those flows
• Roles: hr, applicant, employee

Not built yet (from the big prompt)

• Performance reviews / PIP / probation
• Expense + incident + project reports
• Org chart API
• Policy library + acknowledgments
• Jotform Sign
• Analytics (time-to-hire, submission rates, etc.)
• Hiring-manager as its own role
• Rich employee docs (contract, NIN, certificates beyond CV)
• Frontend (applicant / employee / HR dashboards)
• Migrations — you still need pnpm db:generate && pnpm db:migrate
