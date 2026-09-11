# Debridgers Consultant Feedback

**Meeting date:** 2026-09-10
**Counterparty:** A business consultant and developer, also the Director-General of the Kaduna State Agricultural Development Agency (KADA)
**Companion documents:** `BusinessModel.md` for the canvas and locked decisions, `Company_Diagnosis.md` for the executive assessment, `COMPANY_PROFILE.md` for the factual reference. This document records what changed as a result of one meeting; it does not replace any of the three.

**How to read this document.** Same convention as the rest of this folder: a claim is **PROVEN**, **BUILT**, **CLAIMED**, **ASSUMED**, or **UNKNOWN**, and every number carries the date it was given. Nothing here is invented to fill a gap; a gap is marked `!todo()`.

---

## The headline

The DG's opening position: **"You don't have a farmers problem. You don't have a supply problem."**

This is the single most important sentence from the meeting, because it disagrees with something already written down. `COMPANY_PROFILE.md`'s **THE PROBLEM** section currently says, for farmers, "no direct access to end markets... no reliable bulk off-take." Both can be true at once, read narrowly enough: farmers in general may lack market access, while KADA, as the state agency that works with them at scale, is telling Debridgers specifically that _sourcing produce is not going to be the thing that limits this business_. He is in a position to know, and he is offering to be the reason it stays true.

**What this changes:** the constraint the company should plan around shifts from _"can we find enough supply"_ to _"can we structure demand, working capital, storage, and offtake well enough to use the supply that's already reachable."_ That is a reframing, not a reversal of the target chain in `COMPANY_PROFILE.md` (`Farmer -> Debridgers -> Buyer`) - it says the hard part of that chain is the back half, not the front half.

**Open item.** `THE PROBLEM` in `COMPANY_PROFILE.md` should be revisited against this once the concept note work settles, so the document doesn't carry two positions at once. Not resolved here.

---

## What was actually discussed

### 1. Storage and timing arbitrage - **CLAIMED**, a new idea, not yet tested

Buy produce when the market price is low (at harvest), hold it, sell when the price recovers to a premium. When the market moves against a held position, route the surplus to a processor rather than absorb the loss at open-market price, and keep back what can wait for the price to recover.

This is an **additional revenue stream**, not a replacement for the existing procurement-spread model in `BusinessModel.md`. It introduces two costs the current model doesn't carry: storage (`Company_Diagnosis.md`'s warehouse line is currently imputed at ₦0, which stops being realistic if produce is held on purpose rather than passed straight through) and price risk over the holding period. It should be evaluated as its own line with its own unit economics, not folded into the existing worked examples.

### 2. Investor-financed trading, fee-on-profit - **CLAIMED**, one option among several, not decided

An investor supplies capital to buy produce; Debridgers (or the investor's own instruction) sells at a profit; Debridgers takes a fee out of the profit rather than equity or interest.

**Worth comparing directly against the existing structure**, not adopting on its own terms. `Company_Diagnosis.md` identifies negative working capital - the buyer prepays, so growth doesn't consume cash proportionally - as the strongest structural fact about the company. A profit-fee financing arrangement for a _storage/arbitrage_ line is a different animal: it needs capital ahead of a sale, by definition, since the whole point is buying before a buyer exists. That is closer to the "credit float" discussion in `Company_Diagnosis.md` ("What capital is actually for") than to the core distribution business, and should be sized and reasoned about the same way: a revolving facility against a formula, not equity.

### 3. Buyers are the harder side to collect from - **CONFIRMS** existing model

"It's easier for a farmer to release goods than for a buyer to release funds." Read plainly: once a buyer is convinced to commit, Debridgers should buy and deliver to them, because collecting payment from an already-committed buyer is more reliable than trying to get payment out of a buyer who hasn't committed yet.

This does not contradict the locked prepayment model in `BusinessModel.md` - it explains _why_ that model is correct. It also reinforces the seventh locked decision (channel focus) and the working-capital argument in `Company_Diagnosis.md`: the whole strength of the current setup is that Debridgers never fronts money to a buyer who hasn't already paid.

### 4. Feed raw materials for a "station market" - **CLAIMED**, the most concrete near-term commercial lead

The DG asked Debridgers to supply: **maize, groundnut, GNC (groundnut cake), wheat offal, maize offal, PKC (palm kernel cake), methionine, lysine, and salt.**

These are 9 of the roughly 13 raw materials that go into compound animal feed (poultry/livestock) formulation. "Station market" is presumably a specific feed mill or agro-processing buyer - `!todo()` confirm the actual counterparty name and what "station" refers to.

**Why this matters more than the other ideas in this meeting:** it is a named buyer type, a named product list, and it comes with an implicit introduction from someone who runs the state's agricultural development agency. Every other idea in this meeting is a model to design; this one is close to an order to go fill. It should be the first thing evaluated against `BusinessModel.md`'s existing hero-product and customer-segment framework - most of this list (maize, groundnut) is inside current sourcing capability; the rest (methionine, lysine, PKC, offals) are `!todo()` - unconfirmed whether Debridgers or its existing suppliers can source them at all.

### 5. Outgrower / input-credit scheme - **CLAIMED**, a structured program, not yet run

The shape: distribute inputs (fertilizer, herbicide, pesticide) to farmers on a fixed schedule, under an MOU, in exchange for a fixed quantity of produce back at harvest, at a price locked in when the inputs were given. Target scale discussed: roughly 100 soya bean farmers and 200 maize farmers. Debridgers monitors the farm through the season and runs an aggregation center at harvest.

This is "grounded work" in the DG's words - field-level, not platform-level - and is exactly the kind of program a state agricultural development agency is positioned to co-sponsor: farmer access, land, and credibility that Debridgers doesn't have on its own. It is also the piece with the clearest price risk, worked through below.

**Worked example, as given in the meeting (2026-09-10):**

| Item                                 | Value                               |
| ------------------------------------ | ----------------------------------- |
| Input given                          | 2 bags of fertilizer, ₦40,000 each  |
| Total input cost                     | **₦80,000**                         |
| Produce owed back, per MOU ratio     | 3 bags of maize                     |
| Expected maize price (at input time) | ₦40,000 / bag                       |
| Expected value of 3 bags             | **₦120,000**                        |
| Expected gain                        | ₦40,000 (50% on input cost)         |
| Actual maize price at harvest        | ₦20,000 / bag                       |
| Actual value of 3 bags               | **₦60,000**                         |
| Actual result                        | **₦20,000 loss** against input cost |

Because the open-market sale would have locked in the ₦20,000 loss, the produce was instead routed to a processor to recoup part of it - the same hedge described in the storage/arbitrage idea above (item 1). This is the concrete case for why that hedge needs to exist as a designed fallback, not an improvisation: **the MOU ratio fixes quantity, but nothing in the scheme as described fixes price**, so the input-provider (Debridgers, in this scheme) carries the full downside of a price crash between input distribution and harvest.

**Monitoring, resolved.** KADA already runs weekly reporting on farm produce and the prices it's selling for at market. This closes what would otherwise have been a from-scratch design problem: the season-level monitoring the scheme needs already exists inside KADA, and the same weekly price data is a realistic basis for a price-risk trigger - catching an adverse price move during the season rather than discovering it at harvest, which is when the worked example above was discovered. Applied into `ConceptNote.md` and `ConceptNote_KADA_Submission.md` 2026-09-10.

**Open items on this scheme**, none resolved here:

- Input:output ratio - is 2 bags fertilizer : 3 bags maize the intended MOU ratio, or specific to the DG's own example? `!todo()`
- Who absorbs a price shortfall under the actual MOU terms Debridgers would write - the farmer, Debridgers, or is it split? `!todo()`
- Whether a floor price or a forward contract with the processor (as the buyer of last resort) should be built into the MOU from the start, rather than negotiated after the fact
- Target farmer count (100 soya, 200 maize) - stated as a discussion figure, not a commitment. `!todo()` confirm before it goes into a concept note as a number
- The exact form of KADA's weekly reporting, and whether Debridgers can get read access to it for the pilot LGAs. `!todo()`

### 6. New customer segment: small-scale food processors - **CLAIMED**, expands `COMPANY_PROFILE.md`'s customer segments

Finished street foods made from raw commodities Debridgers already deals in: **Masa** (maize-based), **Waina**, **Dan wake**, and **Maidoya** (yam and egg based), the way akara is made from beans. The idea is to sell raw ingredients to the people who make and sell these - for example, "akara women" - as a customer segment, not for Debridgers to make or package the finished product itself.

This does **not** put Debridgers on the packager side of the NAFDAC line discussed in `Company_Diagnosis.md` and `COMPANY_PROFILE.md`'s **TRADING POSITION** section - the tension flagged in an earlier draft of this analysis was wrong and is retired. Debridgers still sells raw product, sealed as received; the buyer is doing the processing. This is simply a new entry in `COMPANY_PROFILE.md`'s **CUSTOMER SEGMENTS** section, sitting alongside B2B food businesses and institutions.

### 7. Documentation KADA (or any serious partner) will expect

- Company profile document - exists as `COMPANY_PROFILE.md`, and now also as `COMPANY_PROFILE_KADA_Submission.md`, the partner-facing version. **Closed, 2026-09-10.**
- **TIN** (Tax Identification Number) - **Closed, 2026-09-10.** 2621843516171, confirmed from the Nigeria Revenue Service certificate of registration
- **CAC registration** - `COMPANY_PROFILE.md` now records the RC number, 9573579, confirmed from company documents in `docs/business/`. **Closed.**
- **SCUML registration** (Special Control Unit Against Money Laundering, EFCC) - not something this analysis had flagged as needed, but the founder supplied the certificate alongside the Tax ID one: RN SC192104252, issued 2026-08-28. Recorded in `COMPANY_PROFILE.md`, `Company_Diagnosis.md`'s regulatory position section, and both submission documents. **Closed.**
- List of corporate/institutional bodies already supplied - `COMPANY_PROFILE.md`'s **TRACTION** section currently records 2 B2B food business customers, unnamed. `!todo()` whether either should be named in a concept note, and get their consent first if so
- Capacity and market opportunity - what Debridgers can actually deliver, by volume - `!todo()`, not measured (consistent with `COMPANY_PROFILE.md`'s **WHAT IS ACTUALLY KNOWN, AND WHAT IS NOT**, which already lists landed cost, GMV, and AOV as unmeasured)
- Area of farmer concentration, by LGA (Local Government Area, Kaduna State's administrative unit) - `!todo()`, not recorded anywhere in this folder yet

---

## What this changes in the existing documents

Not applied yet - flagged for a separate pass so `BusinessModel.md` stays the single source of truth on numbers, per its own convention:

1. `COMPANY_PROFILE.md`'s **THE PROBLEM** section frames a farmer-side market-access problem. This meeting's headline claim narrows that: Debridgers' own sourcing is not expected to be the constraint, because of the KADA relationship specifically. Needs reconciling, not necessarily rewriting - the general claim and the company-specific claim can both stand if written carefully.
2. `COMPANY_PROFILE.md`'s **CUSTOMER SEGMENTS** section should gain a fourth segment: small-scale food processors/vendors (akara-style finished-food makers).
3. `COMPANY_PROFILE.md`'s **OPEN ITEMS** table should gain: TIN, area of farmer concentration by LGA, and confirmation of the feed-raw-materials buyer's identity.
4. Storage/arbitrage and the outgrower scheme are new potential revenue lines, not yet run. They belong in `BusinessModel.md`'s revenue streams section as **CLAIMED**, not **PROVEN** or **BUILT**, if and when they're formally adopted.
5. **Applied 2026-09-10.** `BusinessModel.md` Decision 2 and `COMPANY_PROFILE.md`'s hero products section now carry a second hero track for the station/central-market segment - rice, maize, beans, groundnut, and soya beans - alongside the unchanged B2B food-business track (rice, beans, oil). Maize, groundnut, and soya beans are not yet buildable: none has a priced catalogue entry.

---

## What's still genuinely unknown

Carried forward as `!todo()`, not guessed at:

- The "station market" buyer's identity and how much of the 9-item feed list Debridgers or its current suppliers can actually source
- The real MOU input:output ratio and who bears price risk under it
- Farmer concentration by LGA
- Storage cost per unit per month (the warehouse line is currently imputed at ₦0 in `Company_Diagnosis.md`, which assumes produce passes straight through - arbitrage breaks that assumption)
- Target farmer counts for the outgrower scheme, as a firm commitment rather than a meeting figure

---

## Next step

Feed this into `ConceptNote.md`, the partner-facing document for KADA - built from what's already settled in `BusinessModel.md` and `COMPANY_PROFILE.md`, plus the feed-raw-materials lead and the outgrower scheme as the two concrete asks, with every unmeasured figure marked as such rather than estimated for effect.
