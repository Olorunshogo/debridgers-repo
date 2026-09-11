# Debridgers Concept Note

**Prepared for:** Kaduna State Agricultural Development Agency (KADA)
**Prepared:** 2026-09-10
**Companion documents:** `BusinessModel.md` for the underlying unit economics, `Company_Diagnosis.md` for the internal assessment, `COMPANY_PROFILE.md` for the full factual reference, `ConsultantFeedback.md` for the meeting this note follows from.

**What this document is.** A concept note is a short pre-proposal, not a full business plan or an investor pitch. Its job is to get a partner to say "develop this further" - here, that means KADA agreeing to a defined pilot, not committing capital or land yet. Every figure below is either measured, cited from `BusinessModel.md`/`COMPANY_PROFILE.md`, or marked `!todo()`. Nothing is estimated for effect - the same convention as the rest of this folder, because a placeholder that looks like a number gets read as one.

**This is the working version.** It carries evidence tags, cross-references, and open items the way every other document in this folder does, so it stays honest and easy to update as facts close. `ConceptNote_KADA_Submission.md` is the polished version built from this one, written to be printed and handed to KADA directly - no internal markers, no jargon, prose throughout. Update this document first when a fact changes, then carry the change into the submission version.

---

## Executive summary

Debridgers is a Kaduna-based B2B agricultural produce and food distribution company with proven demand, a verified payment system, and a corrected pricing model, currently operating at small scale with two repeat customers. Our 2026-09-10 meeting with KADA's Director-General surfaced two concrete opportunities that fit directly inside what the agency already does: supplying raw materials for compound feed production to a buyer KADA identified, and running a structured input-credit ("outgrower") pilot with smallholder maize and soya bean farmers. Neither requires capital or land from KADA. What we're asking for is confirmation of specifics, a joint design session on the pilot's pricing structure, guidance on farmer geography, and KADA's endorsement on the outgrower MOU - the kind of institutional weight an early-stage company cannot manufacture on its own. This note lays out who we are, what changed in our thinking as a result of that meeting, what we're proposing, what it would take to run, and what we'd want to be true before either side commits further.

---

## 1. Who we are

Debridgers LTD, a B2B agricultural produce and food distribution company operating in Kaduna, Nigeria. **Stage:** early revenue - 10+ orders across 2 B2B food-business customers, both repeat buyers, acquired entirely through founder outreach. **Team:** four people, two technical founders, self-funded, ₦300,000 capital on hand. Full detail in `COMPANY_PROFILE.md`.

**Registration:** registered with the Corporate Affairs Commission. **RC number:** 9573579. **Tax ID (Nigeria Revenue Service):** 2621843516171. **SCUML registration** (Special Control Unit Against Money Laundering, EFCC): RN SC192104252, issued 2026-08-28 - worth featuring, not just filing away, since it's real evidence of compliance for a partner or a bank.

**What we've already proven, not claimed:** a working procurement-to-delivery chain, a verified payment layer (Paystack, 75 automated tests across 11 suites on money-path correctness), and a pricing model corrected in production as of 2026-08-29 after finding the previous price list required an unworkable 10.6% procurement advantage just to break even. Detail in `Company_Diagnosis.md`.

**What we stand for.** `COMPANY_PROFILE.md` records the thesis this way: **"Debridgers replaces opaque, uncoordinated intermediation with transparent, measurable, and lower-cost distribution."** Public expression: **"Market Prices. Zero Market Stress."** We do not claim to remove intermediaries - real ones earn their margin through aggregation, transport, storage, financing, grading, and risk absorption. The claim is transparency and coordination, because Debridgers is itself a link in that chain.

**The team:**

| Name                      | Role                                      | Also covers                                               |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| Nwankwo Stephanie         | Founder, lead backend engineer            | Business development, field outreach                      |
| BAMTEFA Olorunshogo Moses | Founder, Chief Technology Officer         | Backend development, business development, field outreach |
| Okpere Henry              | Mobile developer and sales representative | Outreach management, field outreach                       |
| Ajadi Abdulmalik Olayinka | Designer                                  | Brand and campaign material, field outreach               |

All four currently double as field agents, since no agents have been recruited yet. Full role detail and single-point-of-failure analysis is in `COMPANY_PROFILE.md`'s **THE TEAM** section.

---

## 2. The problem, stated carefully

Two things are true at once, and this note doesn't collapse them into one:

- **Generally**, smallholder farmers in Nigeria often lack organized, predictable market access, and buyers often can't source consistent volume, quality, and timing from any one source. This is the broader problem the agricultural sector faces, and it's the reason distribution businesses like Debridgers exist at all.
- **Specifically for Debridgers**, our 2026-09-10 conversation with KADA's Director-General made the point directly: **sourcing is not expected to be our constraint**, because KADA already works with farmers at the scale and organization this business needs. The constraint we should plan around is the back half of the chain - structuring demand, storage, working capital, and offtake well enough to use supply that is already reachable.

That reframes what we're asking KADA for. We are not asking for help finding farmers in the abstract, and we are not proposing another farmer-access program layered on top of what the agency already runs. We are asking to convert an existing relationship and existing agency capacity into two specific, boundable pieces of work, described in section 4.

**Why this matters for how the pilot is scoped.** A proposal built around "help us find supply" would duplicate KADA's own mandate and add nothing. A proposal built around "here is a named buyer and a named farmer program, help us execute both cleanly" uses the agency's actual comparative advantage - reach and credibility with farmers - against a gap Debridgers actually has, which is structured demand and the financial discipline to run an input-credit scheme without it becoming quiet losses nobody tracked.

---

## 3. What Debridgers does today

```text
Supplier  ->  Debridgers  ->  B2B buyer
```

Debridgers sources staples (currently rice, beans, and oil as hero products) into a small warehouse, sells to B2B food businesses at a published price, and delivers by hired vehicle. The default is that the buyer pays before delivery - a deliberate design choice that means Debridgers carries no inventory risk on an unconfirmed sale, and every order to date has run this way. Winning some new buyers away from an existing supplier may mean delivering first and collecting on delivery instead; where that happens it is a deliberate, capped exception, not the standing policy. Full mechanics, pricing, and the seven locked business-model decisions are in `BusinessModel.md`.

Debridgers is a **distributor**, not a packager: goods are sold exactly as received, seal intact. This keeps the company on the simpler, cheaper side of NAFDAC's regulatory line. That position is unchanged by anything in this note.

**Traction to date**, all figures as recorded in `COMPANY_PROFILE.md`:

| Metric              | Value                                              |
| ------------------- | -------------------------------------------------- |
| Orders              | 10+                                                |
| Customers           | 2, both B2B food businesses, both repeat           |
| Acquisition channel | Founder outreach, 100%                             |
| Payment terms       | Prepayment before delivery, on every order to date |
| Active agents       | 0                                                  |
| Formal partnerships | None beyond the Paystack payment integration       |

We are not overstating scale. The value we bring to this partnership is discipline and a working system at small volume, not size.

---

## 4. What we're proposing to do with KADA

Two concrete, separable pieces of work, in priority order.

### 4.1 Feed raw materials supply, near-term, first priority

**What it is.** Supply raw materials for compound feed production to the buyer KADA identified during our meeting, referred to as the "station market." The list discussed: maize, groundnut, GNC (groundnut cake), wheat offal, maize offal, PKC (palm kernel cake), methionine, lysine, and salt - 9 of the roughly 13 raw materials that go into a compound feed formulation.

**Where we stand today.** Maize and groundnut sit inside Debridgers' current sourcing reach, though neither is yet in our sellable catalogue at a set unit and price - that is a `!todo()` we would close before committing volume. The remainder of the list - methionine, lysine, PKC, and the offals - are `!todo()` against our existing supplier base; we do not yet know whether we can source them directly or would need a sub-supplier relationship for that portion of the list.

**What running this would involve:**

1. Confirm the buyer's identity, required volumes, delivery frequency, and quality specification
2. Source and price each item against our supplier base, flagging which we can supply directly and which need a new supplier relationship
3. Run a first order at pilot scale to prove the delivery mechanics and payment terms before committing to a standing supply relationship
4. Establish a recurring supply cadence once the pilot order clears

**What we need from KADA to move this forward:** confirmation of the buyer's identity and required volumes, so we can price and commit honestly rather than provisionally.

### 4.2 Outgrower / input-credit pilot, structured, requires design work first

**What it is.** Distribute farm inputs (fertilizer, and as appropriate herbicide and pesticide) to a defined group of farmers under an MOU, in exchange for a fixed quantity of produce at harvest, at a price agreed when the inputs are given. Debridgers monitors the farm through the season and runs an aggregation center at harvest to collect the produce owed. Discussed scale: roughly 100 soya bean farmers and 200 maize farmers, by Local Government Area - `!todo()` which LGAs, pending KADA's guidance on where farmer concentration and Debridgers' logistics reach overlap best.

**Why this needs a design pass before it's a pilot, not just a plan.** Working through a real example from the 2026-09-10 meeting showed the scheme's central risk clearly. Two bags of fertilizer at ₦40,000 each, against three bags of maize owed back:

| Item                                | Value                               |
| ----------------------------------- | ----------------------------------- |
| Input given                         | 2 bags of fertilizer, ₦40,000 each  |
| Total input cost                    | **₦80,000**                         |
| Produce owed back                   | 3 bags of maize                     |
| Expected maize price, at input time | ₦40,000 / bag                       |
| Expected value of 3 bags            | **₦120,000**                        |
| Expected gain                       | ₦40,000 (50% on input cost)         |
| Actual maize price at harvest       | ₦20,000 / bag                       |
| Actual value of 3 bags              | **₦60,000**                         |
| Actual result                       | **₦20,000 loss** against input cost |

Because the open-market sale would have locked in the loss, the produce was instead routed to a processor to recover part of it. **The fixed quantity ratio in this scheme protects the volume owed back, but does nothing to protect price** - between input distribution and harvest, the input-provider carries the full downside of a market crash. That is a real, sizeable risk on a scheme run at 300 farmers, and it needs a designed answer before it is a pilot rather than an improvisation.

**Options worth deciding between**, none chosen yet:

- A floor price built into the MOU, below which the farmer's obligation is adjusted rather than fixed
- A forward arrangement with a processor as a buyer of last resort, agreed before the season starts rather than negotiated under pressure after a price crash
- A different input:output ratio that prices in a margin of safety against normal price volatility for the crop

**Monitoring is not a gap we need to design from scratch.** KADA confirmed (2026-09-10) that it already runs weekly reporting on farm produce and the prices it's selling for at market. This changes the shape of the pricing-risk problem: rather than building a monitoring system before the pilot can start, the design question becomes how to plug Debridgers' aggregation-center and settlement process into KADA's existing weekly cadence, and - more importantly - whether that same weekly price data can feed a trigger for the floor-price or processor-backstop options above, catching an adverse price move during the season rather than discovering it at harvest. `!todo()` confirm what form KADA's weekly reporting takes and whether Debridgers can get read access to it for the pilot LGAs.

**What running this would involve:**

1. Agree the pricing-risk structure with KADA (see options above), designed to use KADA's existing weekly price reporting as its data source
2. Select target LGAs, based on KADA's existing view of farmer concentration and Debridgers' delivery reach
3. Draft and sign the outgrower MOU, co-signed or endorsed by KADA
4. Distribute inputs on a fixed schedule ahead of planting
5. Monitor farms through the season, on KADA's existing weekly cadence rather than a separate system built for this pilot
6. Run the aggregation center at harvest and collect produce against the MOU
7. Settle each farmer's account and record the actual result against the worked example above, so the second season's ratio or floor price is based on a real outcome rather than one example

**What we need from KADA on this piece:** partnership on farmer access and credibility (an MOU co-signed or endorsed by KADA carries weight an early-stage company's own paper doesn't), and a joint view on the pricing-risk structure before any inputs go out.

### What this pilot is not, yet

Not a request for capital, and not an equity conversation. The ask is partnership, access, and endorsement on a defined pilot, sized small enough to run and measure before either side commits further.

---

## 5. Why Debridgers, specifically

- **A verified payment and reconciliation layer.** Every naira through the platform is tracked in integer kobo and reconciled against Paystack, backed by 75 automated tests across 11 suites asserting deposit idempotency, exact-kobo wallet debits, and cross-account isolation. Relevant to KADA because an input-credit scheme is exactly the kind of arrangement that fails quietly without traceable money movement - a farmer paid the wrong input value, or a repayment recorded incorrectly, becomes a dispute with no record to settle it.
- **A working capital structure that doesn't require KADA or an investor to fund inventory by default.** Buyers prepay as standard practice, and every order to date has been prepaid; Debridgers doesn't hold stock against a sale that hasn't happened. Full reasoning in `Company_Diagnosis.md`.
- **A team already doing the work by hand.** Ten-plus orders and two repeat B2B customers came from direct outreach, not a platform bet that hasn't been tested against real buyers.
- **Kaduna-based, Kaduna-focused.** Not a Lagos platform looking for a pilot market - this is the home market, and the team is already doing field work here.
- **A stated intent to measure rather than assume.** The company's own internal documents mark every unmeasured figure as unmeasured rather than estimating for effect - the same standard this note is written to, and the standard the outgrower pilot's pricing-risk design needs from day one.
- **Registered and compliance-checked, not just incorporated.** CAC registration, a Nigeria Revenue Service Tax ID, and an EFCC SCUML (Special Control Unit Against Money Laundering) registration are all in place. SCUML in particular is the AML/CFT registration a bank or institutional partner expects before treating a company as fully compliant, and it's already closed rather than pending.

---

## 6. What we're asking for

1. Confirmation of the feed raw-materials buyer's identity and volume requirement, so section 4.1 can move from concept to a priced commitment
2. A working session to design the outgrower pilot's price-risk structure (floor price, processor backstop, or ratio adjustment) before any MOU is signed
3. Guidance on which LGAs to target for the farmer pilot, based on KADA's existing view of concentration and readiness
4. In-principle willingness to co-sign or endorse the outgrower MOU, which is what gives it credibility with farmers Debridgers doesn't yet have a relationship with
5. Access to KADA's existing weekly farm-produce and market-price reporting for the pilot LGAs, so the pilot's monitoring and its price-risk trigger both run on data that already exists rather than a system built from scratch

---

## 7. Timeline

A first cut, to be firmed up once items 1-3 in section 6 are answered - not yet a commitment:

| Phase                  | Window                                                        | Content                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design                 | `!todo()`, pending section 6 answers                          | Confirm feed-buyer volumes and pricing; design outgrower pricing-risk structure with KADA; select pilot LGAs; draft the MOU                                                                     |
| Pilot                  | `!todo()`                                                     | First feed-materials order fulfilled; first outgrower MOUs signed at pilot scale, below the 100/200 farmer figures discussed, until the pricing structure is tested against a real season       |
| Harvest and settlement | `!todo()`, keyed to the pilot crops' season, not a fixed date | Aggregation center runs; produce collected against MOU; each farmer's account settled; actual result recorded against the worked example in section 4.2                                         |
| Review                 | `!todo()`                                                     | Measure results against `BusinessModel.md`'s existing discipline: what was PROVEN vs ASSUMED, what the actual price-risk exposure looked like, whether to scale toward the fuller farmer counts |

A five-year view exists in `COMPANY_PROFILE.md`'s **LONG-TERM VISION** section (regional infrastructure layer by 2031, national and cross-border by 2036) and is not repeated here - this note is deliberately scoped to what can be committed to now.

---

## 8. Expected outcomes

Stated as targets to validate through the pilot, not as claims already proven:

**For the farmers in the outgrower pilot.** Guaranteed input access ahead of planting without needing cash up front, and a guaranteed buyer for the agreed volume at harvest, removing two of the most common points of failure for a smallholder season - lack of input capital and no reliable off-take.

**For the feed buyer.** A second, traceable supplier for raw materials it currently sources some other way, with the record-keeping Debridgers already runs on every transaction.

**For KADA.** A measurable, documented pilot of a model the agency can evaluate for wider replication, without KADA carrying the operational or financial load of running it directly.

**For Debridgers.** A second named commercial lane (institutional feed-materials supply) distinct from the existing B2B food-business track, and real operating experience in the "grounded work" - farmer training, input distribution, harvest aggregation - that the target chain in `COMPANY_PROFILE.md` (`Farmer -> Debridgers -> Buyer`) requires but has not yet run.

---

## 9. Monitoring and evaluation

The same discipline `BusinessModel.md` and `Company_Diagnosis.md` already apply internally, extended to this pilot:

| What we'll track                                               | Why it matters                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Feed-materials order volume and fulfilment rate                | Whether section 4.1 can become a standing relationship rather than a one-off order                                         |
| Farmers enrolled vs. farmers who complete the season           | The real attrition rate the pilot needs before scaling toward 100/200                                                      |
| Input cost vs. produce value at settlement, per farmer         | The worked example in section 4.2, run for real, at pilot scale, before it is trusted at full scale                        |
| Price-risk structure performance                               | Whether the floor price, processor backstop, or ratio adjustment actually held when tested against a real harvest price    |
| Aggregation center throughput                                  | Whether the harvest collection process can handle 300 farmers or needs redesigning first                                   |
| Weekly produce and price reports from KADA, for the pilot LGAs | The season-level monitoring feed, sourced from KADA's existing reporting rather than built by Debridgers - see section 4.2 |

Every number here is currently `!todo()`, because the pilot has not run. That is stated plainly rather than estimated, consistent with how every other document in this folder treats an unmeasured figure. The one exception is monitoring cadence itself, which is now answered: weekly, on KADA's existing reporting, not a system still to be designed.

---

## 10. Risks, named plainly

| Risk                                                  | What it means here                                                                                                                                                                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Price risk between input distribution and harvest** | Worked through in section 4.2. The single largest identified risk in the outgrower pilot, and the reason it needs a designed pricing structure before it runs                                                                                                   |
| **Farmer default or partial delivery**                | A farmer may deliver less than the MOU quantity, for reasons ranging from a bad season to selling elsewhere for cash. `!todo()` how the MOU treats a shortfall                                                                                                  |
| **Feed-buyer volume risk**                            | Committing supplier relationships against a buyer whose actual required volume is not yet confirmed. Addressed by item 1 in section 6                                                                                                                           |
| **Team capacity**                                     | Four people, three of them engineers or designers, currently also running the existing B2B business. `COMPANY_PROFILE.md` already identifies this as a structural constraint; a pilot this operationally heavy needs an honest answer on who runs it day to day |
| **Aggregation and storage**                           | The company's warehouse cost today assumes stock passes through quickly; holding harvested produce at an aggregation center is a different cost pattern, currently unmeasured                                                                                   |

None of these are reasons not to run the pilot. They are the reasons it should start at a scale small enough to absorb a wrong guess.

---

## 11. Resource requirement, indicative only

This is not a budget ask to KADA - see section 12 - but KADA will reasonably want to know roughly what the pilot costs to run, so it can weigh the endorsement it is being asked for. Order-of-magnitude only, using the section 4.2 worked example as the only real data point available:

| Cost category                      | Basis                                                                                                                                                         | Status                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Inputs for the outgrower pilot     | ₦80,000 per farmer at the ratio discussed (2 bags fertilizer), before any pesticide or herbicide is added                                                     | Illustrative, from one worked example, not a budget |
| Monitoring through the season      | Rides on KADA's existing weekly reporting rather than a separate system - see section 4.2. Debridgers' own field-visit cost against that cadence is `!todo()` | Partially unmeasured                                |
| Aggregation center at harvest      | `!todo()`, location and running cost not yet identified                                                                                                       | Unmeasured                                          |
| Feed raw-materials working capital | Depends entirely on the buyer's confirmed volume and payment terms, which is why item 1 in section 6 comes first                                              | Unmeasured, gated on KADA's answer                  |

Debridgers intends to fund its own side of the pilot at the scale in section 7. This table exists so KADA can see the shape of the cost, not to solicit funding for it.

---

## 12. What we're not asking KADA to fund

Debridgers is not seeking equity or a cash grant through this note. Where capital is genuinely needed - for instance, to carry a storage/arbitrage position, or to extend credit terms to institutional buyers who won't prepay - `Company_Diagnosis.md` already works out that number as a revolving facility sized by formula, not a lump sum, and that conversation belongs with a financing partner, not with KADA.

---

## Open items before this note is sent externally

- Confirmation of the feed-buyer's identity ("station market")
- Whether either existing B2B customer can be named as a reference, with their consent
- LGA targeting for the outgrower pilot
- A firm date range for the timeline in section 7
- Aggregation-center location for section 9 and 11, once section 6 answers are in. Monitoring cadence is closed: weekly, on KADA's existing farm-produce and price reporting
- The exact form of KADA's weekly reporting and whether Debridgers can get read access to it for the pilot LGAs
