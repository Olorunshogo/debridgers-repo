import {
  AlertTriangle,
  Ban,
  Check,
  CircleDashed,
  Clock,
  MessageSquare,
  Package,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ComingSoon } from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Assisted Checkout | Admin",
    description:
      "Design proposal for admin-raised orders paid by bank transfer.",
    path: "/assisted-checkout",
    noIndex: true,
  });
}

// === Types

type PhaseState = "done" | "next" | "planned";

interface Phase {
  id: string;
  title: string;
  state: PhaseState;
  body: string;
}

interface Step {
  id: string;
  actor: string;
  title: string;
  body: string;
}

type InventoryState = "works" | "partial" | "missing" | "fixed";

interface InventoryRow {
  capability: string;
  state: InventoryState;
  note: string;
}

interface EdgeCase {
  group: string;
  icon: LucideIcon;
  title: string;
  body: string;
}

interface Decision {
  question: string;
  status: "decided" | "open";
  answer: string;
}

// === Content

/*
 * This page is the specification, not a placeholder for one. It is deliberately
 * dated and phase-tracked: a proposal that cannot show its own staleness stops
 * being read and starts being guessed at.
 */

const LAST_REVIEWED = "29 August 2026";

const WEBHOOK_URL =
  "https://clutch-linoleum-splashy.ngrok-free.dev/api/v1/webhook";

const phases: Phase[] = [
  {
    id: "Phase 0",
    title: "Credit dedicated-account deposits",
    state: "done",
    body: "Shipped. charge.success with channel dedicated_nuban now resolves the Paystack customer code to a wallet and credits it through the ledger, idempotent on the transaction reference. This repaired a live, shipped, silently inert feature and proved out the webhook path every phase below depends on.",
  },
  {
    id: "Phase 1",
    title: "Admin creates an order",
    state: "next",
    body: "No payment session yet. The order simply appears in the buyer's account for them to pay the normal way. Immediately useful for buyers who do have the app, and it settles pricing, audit and agent attribution before payments are involved.",
  },
  {
    id: "Phase 2",
    title: "Pay-by-transfer sessions",
    state: "planned",
    body: "The account number, the expiry, the status view, and the double-payment and expiry policies below. Still no SMS: the admin reads the details down the phone, which is worth doing anyway as a test of whether the numbers are clear enough to say aloud.",
  },
  {
    id: "Phase 3",
    title: "SMS and WhatsApp delivery",
    state: "planned",
    body: "Instruction on creation, confirmation on payment, reminder before expiry. This is where the flow becomes genuinely self-service for someone who will never open the app.",
  },
  {
    id: "Phase 4",
    title: "Outreach record to order",
    state: "planned",
    body: "Drive registration from an outreach record, then raise the assisted order once the buyer exists. The shops, owners, phone numbers and product interest are already recorded, so the gap is getting the owner registered, not collecting their details again.",
  },
];

const steps: Step[] = [
  {
    id: "01",
    actor: "Admin",
    title: "Pick the buyer",
    body: "Search registered buyers by phone. The buyer must already have an account: assisted checkout serves existing buyers, it does not create them. If they are not registered, that happens first and separately.",
  },
  {
    id: "02",
    actor: "Admin",
    title: "Build the order",
    body: "Products, quantities, delivery zone and address. Reuse the existing quote endpoint rather than recomputing pricing, or admin-created orders will drift from self-serve ones.",
  },
  {
    id: "03",
    actor: "System",
    title: "Persist the order as unpaid",
    body: "An ordinary row in orders: pending and unpaid, with its own order_reference, plus created_by_admin_id and, when a field agent sourced it, the agent id so commission still flows.",
  },
  {
    id: "04",
    actor: "System to Paystack",
    title: "Open a payment session",
    body: 'Initialize a transaction for the order total with channels: ["bank_transfer"] and metadata { type: "buyer_order", order_id, buyer_id }. Store the returned account number, bank, amount and expiry against the order.',
  },
  {
    id: "05",
    actor: "Buyer",
    title: "Receive the instruction",
    body: "A short SMS or WhatsApp message: bank, account number, exact amount, expiry, order reference, plus a public status link that needs no login. Assume the buyer reads the SMS and never opens the link, so the message alone must be enough to pay.",
  },
  {
    id: "06",
    actor: "Buyer to bank",
    title: "Transfer",
    body: "From any banking app or a banking hall. Nothing happens on our side.",
  },
  {
    id: "07",
    actor: "Paystack to system",
    title: "Webhook confirms the order",
    body: "The existing buyer_order branch marks it paid and confirmed, which already notifies admins that an order awaits delivery. Add the buyer's own confirmation message here.",
  },
];

const inventory: InventoryRow[] = [
  {
    capability: "Order paid via webhook metadata",
    state: "works",
    note: "The buyer_order branch. Reused as-is.",
  },
  {
    capability: "Webhook replay protection",
    state: "works",
    note: "WebhookDeduplicationService.",
  },
  {
    capability: "Missed-webhook recovery",
    state: "works",
    note: "order-reconciliation.service. Extend to cover sessions.",
  },
  {
    capability: "Admin notified of new work",
    state: "works",
    note: "Order-confirmed fan-out ships already.",
  },
  {
    capability: "Dedicated-account deposit crediting",
    state: "fixed",
    note: "Was shipped and silently inert. Fixed in Phase 0.",
  },
  {
    capability: "Buyer contact data",
    state: "partial",
    note: "Outreach records hold it, but nothing converts one to a buyer.",
  },
  {
    capability: "Admin acts on a buyer's behalf",
    state: "partial",
    note: "buyerAdminLogs exists, but there is no order path.",
  },
  {
    capability: "Admin creates an order",
    state: "missing",
    note: "Orders originate only from buyer checkout.",
  },
  {
    capability: "Pay-by-transfer session",
    state: "missing",
    note: "No transfer channel, no session record.",
  },
  {
    capability: "Outbound SMS / WhatsApp",
    state: "missing",
    note: "Email only today. The flow depends on this.",
  },
];

const edgeCases: EdgeCase[] = [
  {
    group: "Money",
    icon: Wallet,
    title: "They pay twice",
    body: "The transfer seems not to arrive, the admin reissues, and both land. An order can only be paid once, so the second payment lands in the wallet.",
  },
  {
    group: "Time",
    icon: Clock,
    title: "The session expires",
    body: "Transfer accounts are short-lived. Decide whether the order stays pending, auto-cancels, or can be reissued against the same order, and what happens when someone pays after expiry, which does happen.",
  },
  {
    group: "Time",
    icon: Ban,
    title: "Prices move",
    body: "The total is frozen at creation. If the catalogue changes before payment, the buyer pays what they were told and the margin difference is the business's problem, not theirs.",
  },
  {
    group: "Stock",
    icon: Package,
    title: "Unpaid orders and inventory",
    body: "Hold stock for an unpaid order and a few abandoned ones can empty the catalogue. Do not hold it and you can confirm payment for something you cannot deliver.",
  },
  {
    group: "Trust",
    icon: ShieldAlert,
    title: "Admins spending other people's names",
    body: "Anyone with admin access can raise orders against any buyer. Every assisted order records the creating admin and writes an audit entry. Extend buyerAdminLogs rather than inventing a second log.",
  },
  {
    group: "Trust",
    icon: AlertTriangle,
    title: "Sending an account number by SMS",
    body: "This trains buyers to transfer money to a number that arrived in a text, which is exactly what fraudsters do. Send from a consistent sender ID, always include the order reference, and never send an account number the buyer did not just ask an admin for.",
  },
  {
    group: "People",
    icon: Users,
    title: "The caller is not registered",
    body: "The admin is on the phone and the buyer has no account. Assisted checkout cannot proceed, so the flow needs somewhere to go rather than a dead end: send a registration link and call back, or capture the interest as an outreach record. Decide which, or admins will invent their own workaround.",
  },
  {
    group: "People",
    icon: Wallet,
    title: "Agent commission",
    body: "If a field agent sourced the order they should earn on it. Commission keys off metadata.agent_id today, so the agent must be captured at creation or the earning silently vanishes.",
  },
  {
    group: "Recovery",
    icon: CircleDashed,
    title: "The webhook never arrives",
    body: "Without a poll against Paystack, a buyer who has paid sits looking at an unpaid order. Reconciliation has to cover open sessions, not just orders.",
  },
  {
    group: "Ops",
    icon: MessageSquare,
    title: "Two admins, one buyer",
    body: "Nothing stops two admins raising the same order minutes apart. A buyer with an open unpaid session should surface it rather than silently opening a second one.",
  },
];

const decisions: Decision[] = [
  {
    question: "What happens to money that does not match an order?",
    status: "decided",
    answer:
      "It always credits the buyer's wallet. A dedicated account is per-customer, not per-order, so two open orders of the same price are indistinguishable at the webhook. Orders are paid from the balance as a separate, deliberate step. This is what Phase 0 implements.",
  },
  {
    question: "Can a phone number alone constitute a buyer?",
    status: "decided",
    answer:
      "No. Assisted checkout is only ever raised for an already-registered buyer. The feature is not about onboarding someone, it is about sparing a registered buyer the checkout: we already know what they want, so we build the order for them and they only have to send the money. Email stays required, nothing downstream has to tolerate a buyer who cannot log in, and there is no unclaimed-account state to design.",
  },
];

const schemaNeeds: string[] = [
  "A payment session table. One row per attempt to collect for an order: order id, provider reference, account number, bank, exact amount, expiry, status, and the admin who opened it. An order can have several over its life, and each reissue is its own row.",
  "orders.created_by_admin_id, nullable. Present means assisted, absent means self-serve, and that single field answers most reporting questions later.",
  "orders.source, one of self_serve, assisted or agent. Cheaper than deriving it from which columns happen to be null.",
  "A public status token for the no-login link. Random and unguessable, never the order id and never the reference that also goes out by SMS.",
];

// === Helpers

const phaseStateLabel: Record<PhaseState, string> = {
  done: "Shipped",
  next: "Up next",
  planned: "Planned",
};

const phaseStateClass: Record<PhaseState, string> = {
  done: "bg-green-100 text-green-800",
  next: "bg-amber-100 text-amber-800",
  planned: "bg-line text-body",
};

const inventoryStateLabel: Record<InventoryState, string> = {
  works: "Works",
  fixed: "Fixed",
  partial: "Partial",
  missing: "Missing",
};

const inventoryStateClass: Record<InventoryState, string> = {
  works: "bg-green-100 text-green-800",
  fixed: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  missing: "bg-red-100 text-red-800",
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-line rounded-2xl border bg-white p-6">
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="mb-4">
      <p className="text-primary mb-1 text-xs font-semibold tracking-wider uppercase">
        {eyebrow}
      </p>
      <h2 className="font-syne text-heading text-lg font-semibold">{title}</h2>
    </header>
  );
}

// === Page

export default function AdminAssistedCheckout() {
  return (
    <div className="flex flex-col gap-6">
      <ComingSoon
        commented={false}
        variant="page"
        title="Assisted Checkout"
        description="Letting an admin raise an order for a buyer, hand them an account number, and have the order confirm itself the moment the transfer lands."
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-line text-body rounded-full px-3 py-1 text-xs font-medium">
            Design proposal
          </span>
          <span className="text-body text-xs">
            Last reviewed {LAST_REVIEWED}
          </span>
        </div>

        <p className="max-w-2xl leading-relaxed">
          This page is the plan, not the feature. Nothing here is built except
          Phase 0, which shipped alongside it.
        </p>

        <Card>
          <SectionHeading eyebrow="01" title="What this is" />
          <div className="text-body flex flex-col gap-3 text-sm leading-relaxed">
            <p>
              A transaction-scoped bank transfer. The system commits to a
              specific charge, the gateway hands back a bank account and an
              exact amount, the buyer transfers, and a webhook fires against
              that charge, so we know precisely what was paid for.
            </p>
            <p>
              The second idea on top: the person who starts the order is not the
              person who pays for it. An admin builds the order while on the
              phone with a shop owner, the shop owner gets an account number by
              SMS or WhatsApp, and when they transfer, the same order flips to
              paid. No app, no login, no cart.
            </p>
            <p>
              It stays one order. Buyer checkout already works this way: the
              order is created first as unpaid, and the payment carries the
              order id in its metadata. Assisted checkout changes{" "}
              <span className="text-heading font-semibold">who creates</span>{" "}
              the order, not what an order is.
            </p>
          </div>
        </Card>

        <Card>
          <SectionHeading
            eyebrow="02"
            title="Architecture: not the buyer's DVA"
          />
          <div className="text-body flex flex-col gap-3 text-sm leading-relaxed">
            <p>
              The instinct is to reuse the dedicated virtual account, since
              every buyer already has one. It is the wrong instrument, for a
              reason that does not show up until there is volume.
            </p>
            <p>
              A DVA is per-customer, not per-order. It is a permanent address
              for a person. When money lands in it, the webhook can tell you who
              paid but not what for. If that buyer has two open orders, or one
              open order and an intent to top up, you are guessing. Matching on
              amount fails the moment two orders cost the same, which for a
              catalogue with fixed pack prices is most of the time.
            </p>
            <p>
              Use a transaction-scoped transfer instead. Attribution is exact,
              the account expires on its own, and the webhook carries our
              metadata, which means the existing buyer_order branch confirms it
              verbatim. The only new work is creating the order and surfacing
              the account details.
            </p>
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="03" title="The flow, end to end" />
          <ol className="flex flex-col gap-4">
            {steps.map((step) => (
              <li key={step.id} className="flex gap-4">
                <span className="bg-line text-heading mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {step.id}
                </span>
                <div>
                  <p className="text-primary mb-0.5 text-xs font-semibold tracking-wide uppercase">
                    {step.actor}
                  </p>
                  <h3 className="text-heading mb-1 text-sm font-semibold">
                    {step.title}
                  </h3>
                  <p className="text-body text-sm leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <SectionHeading eyebrow="04" title="What already exists" />
          <p className="text-body mb-4 text-sm">
            Most of this is built. The genuinely new surface is smaller than it
            looks.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-136 text-left text-sm">
              <thead>
                <tr className="border-line border-b">
                  <th className="text-heading pr-4 pb-2 font-semibold">
                    Capability
                  </th>
                  <th className="text-heading pr-4 pb-2 font-semibold">
                    State
                  </th>
                  <th className="text-heading pb-2 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row) => (
                  <tr key={row.capability} className="border-line border-b">
                    <td className="text-heading py-3 pr-4 align-top">
                      {row.capability}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${inventoryStateClass[row.state]}`}
                      >
                        {inventoryStateLabel[row.state]}
                      </span>
                    </td>
                    <td className="text-body py-3 align-top">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="05" title="Webhook configuration" />
          <div className="text-body flex flex-col gap-3 text-sm leading-relaxed">
            <p>
              Paystack posts to{" "}
              <span className="text-heading font-mono text-xs break-all">
                {WEBHOOK_URL}
              </span>{" "}
              in both Test and Live mode, confirmed {LAST_REVIEWED}.
            </p>
            <p>
              That path resolves to PaystackWebhookController. There is a
              second, older endpoint at /api/v1/payment/webhook on
              PaymentController, and both handle charge.success with different
              logic. Only the first receives traffic today, which is worth
              knowing before changing either: a fix applied to the wrong one is
              invisible rather than broken.
            </p>
            <p>
              Phase 0 credits transfers on both endpoints, keyed on the Paystack
              transaction reference, so the money lands exactly once even if
              both were ever pointed at.
            </p>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-red-900">
                Live mode points at a development tunnel
              </h3>
              <p className="text-sm leading-relaxed text-red-900">
                Both environments share one ngrok URL, so a real payment in Live
                mode is delivered to whichever machine happens to be running the
                tunnel. When it is not running, Paystack retries and then gives
                up, and the order is never confirmed. Point Live at the deployed
                backend before taking live payments.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="06" title="The cases that will bite" />
          <p className="text-body mb-4 text-sm">
            The happy path is easy. These decide whether the feature survives
            contact with real shop owners.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {edgeCases.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="border-line rounded-xl border p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="text-primary h-4 w-4 shrink-0" />
                    <span className="text-body text-xs font-semibold tracking-wide uppercase">
                      {item.group}
                    </span>
                  </div>
                  <h3 className="text-heading mb-1 text-sm font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-body text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="07" title="Decisions" />
          <div className="flex flex-col gap-4">
            {decisions.map((decision) => (
              <div
                key={decision.question}
                className="border-line rounded-xl border p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      decision.status === "decided"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {decision.status === "decided" ? "Decided" : "Open"}
                  </span>
                  <h3 className="text-heading text-sm font-semibold">
                    {decision.question}
                  </h3>
                </div>
                <p className="text-body text-sm leading-relaxed">
                  {decision.answer}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="08" title="What the schema needs" />
          <ul className="flex flex-col gap-3">
            {schemaNeeds.map((need) => (
              <li
                key={need}
                className="text-body flex gap-3 text-sm leading-relaxed"
              >
                <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <span>{need}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionHeading eyebrow="09" title="Sequencing" />
          <p className="text-body mb-4 text-sm">
            Each phase is independently useful. Nothing here needs the phase
            after it to be worth shipping.
          </p>
          <ol className="flex flex-col gap-4">
            {phases.map((phase) => (
              <li key={phase.id} className="border-line rounded-xl border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-heading text-sm font-semibold">
                    {phase.id}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${phaseStateClass[phase.state]}`}
                  >
                    {phaseStateLabel[phase.state]}
                  </span>
                </div>
                <h3 className="text-heading mb-1 text-sm font-semibold">
                  {phase.title}
                </h3>
                <p className="text-body text-sm leading-relaxed">
                  {phase.body}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </ComingSoon>
    </div>
  );
}
