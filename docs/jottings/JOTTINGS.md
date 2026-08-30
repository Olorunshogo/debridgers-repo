# Jottings

Loose notes, references, and inventories that do not belong to a numbered
backlog item. Anything here that becomes real work moves to
`docs/frontend/TASKS.md` with a spec.

---

## Open notes

1. The homepage stats should come from an endpoint rather than being hardcoded
2. The commission shown on the agents page should be the admin-set value from
   `system_settings`, not a literal
3. After payment, redirect to the overview page

---

## Meeting notes

1. Letter-headed paper
2. Partnership: what worked, what did not, and how to improve sales.
   **Now answered in `docs/business/Company_Diagnosis.md`**
3. Source farmers the normal way and keep them
4. Google Kubernetes Engine as a deployment option

---

## Resources

- Pitch deck reference: https://www.spectup.com/resource-hub/what-is-a-pitch-deck

---

## Credentials

**These are test accounts on a non-production environment.**

| Role  | Address                                 |
| ----- | --------------------------------------- |
| Buyer | `reeach.olorunshogo@gmail.com`          |
| Buyer | `0x0dgp@gmail.com`                      |
| Buyer | `5871graceful@emalupe.com`, 09132432456 |
| Agent | `yusiomone@gmail.com`                   |

Shared password: `Password001@`

**This block violates a KPI the company sets for itself:** no plaintext
credentials committed. Moving the file did not fix that, because the password is
already in git history and stays there.

What actually fixes it:

1. **Rotate the password now** if any of these accounts exist in production, or
   share a password with one that does
2. Move the values to an untracked `.env` or a secrets manager, and gitignore
   whatever holds them
3. Scrub the history only if these credentials ever guarded anything real. For
   throwaway seed accounts on a dev database, rotating and untracking is enough

Until step 1 and 2 happen, `KPI.md` section 6 stays marked not met.

---

## Email addresses

Inventory of every email address in the repo, so nobody has to rescan.
Last scanned 2026-07-23.

### Mailboxes to create at `debridgers.com`

| Address    | Purpose                                                          |
| ---------- | ---------------------------------------------------------------- |
| `support@` | User support. Shown in the UI and in transactional email footers |
| `partner@` | Partnership enquiries. Footer only                               |
| `noreply@` | Outbound from-address for system mail                            |
| `admin@`   | Seeded admin account login                                       |

`noreply@` and `admin@` are env-driven through `MAILTRAP_FROM_EMAIL` and
`ADMIN_EMAIL`. Set them in the real `.env`; the hardcoded values are only
fallbacks.

### Placeholders, no action needed

Swagger `example:` values (`chukwudi@`, `amina@`, `ngozi@`, `fatima@` at
example.com), form placeholders (`you@example.com`), and the benchmark fixture
`nobody@bench.test`.

### Personal addresses in tracked files

- The test accounts above
- `libs/shared-utils/src/actions/contactForm.ts:28-29`, commented-out sample
  data holding two personal Gmail addresses. **Delete these lines**; they serve
  no purpose and are the easiest item on this page to close
