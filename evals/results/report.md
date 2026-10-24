# Jev eval results

Generated 2026-10-24T01:58:21.972Z. Transcripts: FIX, MYFW, GBCI, KRC, REXR, USCB, VTMX, WSFS, FHB, PFBC (160 labeled items; 160 with a Jev answer). Method: [../README.md](../README.md).

"Human" labels are Claude Opus 5.5 acting as the gold annotator. "Judge" is the majority vote of three Claude Sonnet 5.5 samples.

## Headline

| Comparison | n | Exact | Lenient (in acceptable set) | Cohen's κ |
|---|---|---|---|---|
| Judge vs human | 160 | 88% | 98% | 0.88 |
| Jev vs human | 160 | 68% | 91% | — |
| Jev vs judge | 160 | 71% | 95% | — |

Judge verdict on Jev ("is Jev's answer acceptable?") matches the human verdict on **93%** of items (κ 0.42). The judge rates Jev acceptable on 95% of items; the human rates it acceptable on 91%.

Jev probability quality vs human labels: log loss 0.81, Brier 0.46, ECE 0.10. Judge self-consistency: all three samples agree on 85% of items.

## Per question

| Question | Judge–human exact | Judge–human κ | Judge unanimous | Jev–human exact | Jev–human lenient | Jev log loss | Unclear (human / judge / Jev) |
|---|---|---|---|---|---|---|---|
| Underlying demand | 100% | 1.00 | 90% | 100% | 100% | 0.32 | 0% / 0% / 0% |
| Organic growth quality | 80% | 0.58 | 80% | 60% | 80% | 0.81 | 10% / 0% / 0% |
| Realized pricing | 70% | 0.55 | 60% | 60% | 90% | 1.21 | 10% / 20% / 20% |
| Competitive position | 90% | 0.85 | 60% | 60% | 90% | 1.03 | 50% / 50% / 90% |
| Margin durability | 80% | 0.58 | 90% | 60% | 100% | 1.03 | 0% / 0% / 0% |
| Earnings adjustments | 90% | 0.83 | 60% | 60% | 80% | 1.06 | 20% / 20% / 10% |
| Cash conversion | 100% | 1.00 | 80% | 90% | 100% | 0.26 | 80% / 80% / 90% |
| Working capital | 100% | 1.00 | 100% | 100% | 100% | 0.10 | 90% / 90% / 90% |
| Guidance revision | 90% | 0.86 | 100% | 80% | 90% | 0.50 | 0% / 0% / 0% |
| Outlook visibility | 80% | 0.58 | 90% | 30% | 70% | 1.83 | 0% / 0% / 0% |
| Funding resilience | 90% | 0.79 | 80% | 50% | 80% | 1.09 | 20% / 10% / 60% |
| Execution risk | 100% | 1.00 | 90% | 70% | 100% | 0.70 | 0% / 0% / 10% |
| Capital allocation | 100% | 1.00 | 100% | 70% | 80% | 0.57 | 20% / 20% / 40% |
| Shareholder dilution | 70% | 0.44 | 90% | 80% | 100% | 1.00 | 50% / 80% / 70% |
| Disclosure quality | 90% | 0.00 | 90% | 30% | 100% | 1.08 | 0% / 0% / 0% |
| Q&A accountability | 80% | 0.00 | 100% | 80% | 100% | 0.37 | 0% / 0% / 0% |

Each question has only 10 items, so per-question κ is noisy and read best as a ranking.

## Calibration (Jev top probability vs exact match with human)

| Top probability | n | Mean confidence | Accuracy |
|---|---|---|---|
| 0.0–0.5 | 19 | 0.43 | 53% |
| 0.5–0.7 | 45 | 0.60 | 51% |
| 0.7–0.9 | 45 | 0.80 | 67% |
| 0.9–1.0 | 51 | 0.97 | 88% |

## Grounding (verbatim quote check)

| Labeler | Quotes | Found in transcript | Non-absence labels with no verified quote |
|---|---|---|---|
| human | 427 | 100% | 0 of 160 (0%) |
| judge | 1462 | 99% | 0 of 480 (0%) |

## Perturbations (Jev only)

| Test | Expected | n | Labels changed vs base | → favorable | ← favorable | Mean Δ P(favorable) | Unclear base → perturbed |
|---|---|---|---|---|---|---|---|
| Rerun (noise floor) | Identical | 160 | 3% | 0 | 3 | -0.000 | 30% → 31% |
| Prompt injection | No more change than noise; no favorable shift | 160 | 6% | 1 | 7 | -0.012 | 30% → 31% |
| Optimistic fluff | No favorable shift | 160 | 3% | 0 | 4 | -0.011 | 30% → 30% |
| Truncated to 20% | Unclear rate rises | 160 | 42% | 5 | 35 | -0.137 | 30% → 57% |

Q&A removed: `qa` became `no_qa` on **100%** of 10 calls.

## Disagreements (Jev outside the human's acceptable set)

| Call | Question | Jev (p) | Human primary (acceptable) | Judge primary | Human reasoning |
|---|---|---|---|---|---|
| MYFW | visibility | mixed (0.62) | supported (supported) | supported | Specific forward indicators support the outlook: balance momentum, repricing amounts and pipeline activity. |
| MYFW | allocation | unclear (0.39) | disciplined (disciplined) | disciplined | Allocations come with return rationales and capital comfort, and lending growth is deliberately selective. |
| GBCI | liquidity | unclear (0.60) | ample (ample, adequate) | ample | Strong deposit growth, an improving loan-to-deposit ratio, securities cash flows and accumulating capital point to comfortable funding. |
| KRC | allocation | mixed (0.49) | disciplined (disciplined) | disciplined | Allocation is self-funded through land sales and guided by stated yield hurdles and pre-leasing requirements, with debt repaid from cash. |
| REXR | organic | broad_based (0.57) | mixed (mixed, contracting) | mixed | Comparable occupancy and leasing are improving, but same-property NOI was lower year over year. Flat Core FFO relied on capital recycling, buybacks and G&A cuts. Underlying and external drivers coexist without a clear do |
| REXR | visibility | conditional (0.57) | supported (supported, mixed) | supported | Signed but not-yet-commenced leases, the occupancy exit rate, an explicit flat-rent assumption and current Q4 activity support the outlook. Longer-term occupancy targets depend on the market, and no 2027 guidance was giv |
| USCB | guidance | no_comparison (0.68) | maintained (maintained, mixed) | maintained | Loan growth guidance is explicitly reaffirmed against a stated prior range. The NIM guide lacks an explicit comparable baseline. Overall, guidance is maintained. |
| VTMX | adjustments | opaque (0.59) | material (material, recurring_exclusions, limited) | material | Revaluation gains materially distort pre-tax income but are explained. The emphasized FFO also excludes current income tax, which is a recurring cost. The adjustments are material yet reasonably described. |
| VTMX | visibility | conditional (0.52) | supported (supported, mixed) | mixed | With nine months complete, the full-year outlook is supported by long-term leases, higher occupancy and indexation. Longer-term growth from the spec pipeline depends on future lease-up, but that does not drive the curren |
| WSFS | adjustments | opaque (0.33) | unclear (unclear, limited) | unclear | Core metrics are emphasized, but the call does not describe what is excluded from them. The non-recurring expense benefits were quantified at $2-3M and were not excluded. |
| FHB | pricing | unclear (0.56) | improving (improving, mixed) | mixed | Asset yields and deposit costs both improved, so NIM expanded 5bp. Fixed-rate asset repricing continues at a 160-170bp spread. Offsets are the loss of one loan to aggressive pricing and deposit costs at a trough, but rea |
| FHB | liquidity | unclear (0.60) | ample (ample, adequate) | ample | Deposits grew and the non-interest-bearing mix is solid, and management repeatedly describes liquidity as ample. Detailed liquidity sources are not quantified. |
| PFBC | organic | mixed (0.44) | unclear (unclear, contracting) | mixed | There are no acquisitions. Loans dipped, but mainly because of a held-for-sale transfer and payoffs. Deposit growth was modest and partly brokered. The split between core and other activity is not quantified, so growth q |
| PFBC | competitive | unclear (0.53) | mixed (mixed, losing, holding) | mixed | Management cites concrete switching of deposits to Treasuries and growing non-bank competition. Total deposits still grew, though partly through brokered funding. The evidence shows some outflow alongside a deposit base  |

## Cost

Opus human labels $1.97, Sonnet judge labels $1.85, Jev $0.027 across 60 runs.
