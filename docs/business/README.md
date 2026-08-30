# Business documents

Five documents, roughly 2,900 lines, with deliberate overlap. This says which
one answers which question and which wins when they disagree.

| Document                                                           | Answers                                                                                                            | Length |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------ |
| **`BusinessModel.md`**                                             | _Why_ every number is what it is. Unit economics, worked examples, the seven locked decisions, the glossary        | 1,479  |
| **`COMPANY_PROFILE.md`**                                           | _What is true_ about the company. Team, products, pricing, capital, traction, open items, glossary, competitor set | 628    |
| **`Company_Diagnosis.md`**                                         | _What is wrong and in what order_. The executive assessment                                                        | 286    |
| **`debridgers_strategic_investor_partnership_growth_strategy.md`** | _Capital, partnerships and the 90-day plan_                                                                        | 353    |
| **`ONBOARDING.md`**                                                | _What a new joiner needs on day one_                                                                               | 160    |

## Which wins

**`BusinessModel.md` is authoritative on any number and any definition.** It
carries the derivations; the others carry conclusions. Where a figure disagrees,
the model is right and the other document is stale - fix it there rather than
reasoning from it.

**Code is authoritative over all five on anything shipped.** `packages/pricing`
holds the live rates, floors, caps and thresholds. A document describing pricing
is describing the intent; the package is the fact. If they differ, the document
is out of date.

## Conventions

**Every decision carries its date.** Three documents once carried a ₦1,400
placeholder unit price for months because nobody wrote down what the company
actually sells, and reasoning from it produced the conclusion that the margin
was structurally too thin to work. That conclusion was wrong. Dating a decision
is what lets the next reader tell a fact from a fossil.

**Status is stated, never implied.** A figure is measured, estimated, or
unknown. `packages/pricing/src/assumptions.ts` holds each one with its status in
code, so a margin computed from guesses is visibly computed from guesses. When a
real figure arrives, one value changes there.

**`!todo()` marks a genuine unknown.** It is not a placeholder value. A
placeholder that looks like a number will eventually be read as one.

## On intermediaries

Recurring correction, so it is written here once. **Debridgers does not claim to
remove intermediaries.** It buys from suppliers who are intermediaries and will
keep doing so wherever they supply quality, because real ones earn their margin:
aggregation, transport, storage, financing, grading, risk absorption, market
discovery.

The problem was never that a link exists in the chain, it is that the chain is
opaque and uncoordinated. The claim is **transparency and coordination, not
elimination** - and it is the stronger claim, because Debridgers is itself a
link in that chain. Any copy that says otherwise is retired framing.

## Currently open

The five measurement items in `COMPANY_PROFILE.md`, of which **landed cost of
goods is the one that moves everything else**, and the competitor set at the end
of that file. Everything else in this folder is decided.
