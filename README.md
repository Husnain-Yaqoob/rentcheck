# RentCheck

Check whether an Irish rent increase is legal under the rent control rules in force from
1 March 2026.

The RTB publishes a [rent calculator](https://rtb.ie/rtb-rent-calculator/) that does the
arithmetic. This does the half it doesn't: whether the **notice itself is valid**, whether a
claimed exemption stands up, and whether the landlord was entitled to reset the rent at all.
Those are where the money actually is — an invalid notice cannot raise the rent no matter how
correct the sums are, and there is no time limit on challenging one.

**Not legal advice.** It is an open-source reading of published rules and it can be wrong.

---

## What it does

- Works out the maximum lawful rent under the **dual test** in section 19 of the Residential
  Tenancies Act 2004 — 2% per annum apportioned by elapsed time, and CPI movement over the same
  period, with the lower of the two governing.
- Handles the **new apartment / student accommodation carve-out**: where the commencement notice
  was filed on or after 10 June 2025, the 2% ceiling doesn't apply and CPI alone governs, so rent
  can lawfully rise by more than 2%.
- Tells the user which **regime** their tenancy sits in. Tenancies that began before 1 March 2026
  keep the old termination rules permanently and never get a six-yearly market-rent reset — the
  cap, however, applies to everyone from that date.
- Checks the **notice** against the prescribed form: 90 days' notice, twelve-month review interval,
  three comparable dwellings, RTB calculation enclosed, the rule relied on stated, and service on
  the RTB within the window.
- Flags the **anti-avoidance rule**: a landlord may not reset to market rent after a no-fault
  eviction. The arithmetic can look perfect while the reset was never permitted in the first place.
- Computes the **dispute deadline** — the later of the date the new rent falls due and 28 days from
  receipt — and correctly reports that there is *no* deadline where the notice is invalid.
- Drafts a measured **letter to the landlord** setting out the position.

Everything runs client-side. No account, no database, no analytics, nothing leaves the device.

## Running it

```bash
npm install
npm run fetch:cpi   # pulls the CPI series from the CSO — see below
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` | Production build (fully static) |
| `npm test` | Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run fetch:cpi` | Refresh `data/cpi-index.json` from the CSO |

## The CPI data

`data/cpi-index.json` is **fetched, never hand-written.** Index numbers are not invented or
hardcoded anywhere in this repo — a plausible-looking wrong index produces a plausible-looking
wrong legal figure, which is worse than no figure at all.

`npm run fetch:cpi` pulls CSO series **CPM24** (Consumer Price Index, All Items, base
December 2023 = 100) from the PxStat API and writes it to that file, recording when in `fetchedAt`.
Run it monthly; the CSO publishes with roughly a ten-day lag.

If the table has no value for a month the calculation needs (for example a rent-setting date after
the latest published month, or a table that has not been fetched), the app applies the 2% limb
only, labels the answer provisional, and offers a field for entering the two index values by hand.

Note the index changed: the regime used **HICP** until 28 February 2026, and **CPI** from
1 March 2026. They diverge materially — 3.4% against 3.7% in August 2026 — so using the wrong one
is a real error, not a rounding difference.

## Architecture

```
src/lib/          Pure rules engine — no React, no I/O, fully unit-tested
  dates.ts        UTC calendar arithmetic with month-end clamping
  cpi.ts          Index lookup; the month-convention decision lives here alone
  cap.ts          The section 19 dual test
  regime.ts       Which regime applies; market-reset permission
  notice.ts       Notice validity checks and dispute deadline
  verdict.ts      Composes the above into a single answer
  letter.ts       Letter generation
src/components/   Client UI
data/             CPI index table (fetched, not authored)
scripts/          CSO fetch script
```

The rules engine is deliberately separated from the UI and free of side effects, so every legal
rule is testable in isolation and the whole thing prerenders to static HTML.

## Tests

The backbone of the suite is the three **worked examples from the official government guidance**
on the Residential Tenancies (Amendment) Act 2021, published by the RTB:

| Rent | Period | Inflation | Expected | Binding limb |
| --- | --- | --- | --- | --- |
| €1,800 | 12 months | 5.2% | +€36 | 2% |
| €1,400 | 5 years | 6.6% | +€92 | CPI |
| €813 | 2 years | 13.1% | +€33 | 2% |

Plus regime determination, notice validity, dispute deadlines, the carve-out, and a regression
test for month-end date handling — JavaScript's native `setMonth` turns 31 January + 1 month into
3 March, which silently corrupts the elapsed period for any rent set on the 29th, 30th or 31st.

```bash
npm test
```

## Known uncertainties

Documented rather than hidden, because both would produce confidently wrong numbers:

1. **Which two CPI months are compared.** Under the HICP predecessor the statute compared the month
   immediately preceding each rent setting, and the RTB calculator takes the two rent-setting dates
   as its inputs. This app follows the month-preceding convention, isolated in `indexMonthFor()` in
   `src/lib/cpi.ts` so it can be corrected in one place. CPI is published with a ten-day lag, so an
   off-by-one here matters. **Validate against the RTB calculator across a spread of dates before
   relying on it.**

2. **Reviews spanning the transition.** Where rent was last set before 1 March 2026 and the new rent
   takes effect after, whether the ratio is computed wholly on CPI or spliced across HICP and CPI is
   not something the published sources settle.

3. **Notice service window.** From 14 September 2026 a landlord has 7 days to send the RTB its copy;
   before that it had to go the same day. The RTB's own published forms still say same-day, so some
   official material is currently out of date.

## Sources

- [Residential Tenancies (Miscellaneous Provisions) Act 2026](https://www.irishstatutebook.ie/eli/2026/act/3/enacted/en/html)
- [RTB — setting and reviewing private rents from 1 March 2026](https://rtb.ie/renting/setting-and-reviewing-private-rents-from-1-march-2026/)
- [RTB Rent Calculator](https://rtb.ie/rtb-rent-calculator/)
- [Citizens Information — rent increases](https://www.citizensinformation.ie/en/housing/renting-a-home/landlords-rights-and-responsibilities/rent-increases-in-private-rented-housing/)
- [gov.ie — rental sector reforms from 1 March 2026](https://www.gov.ie/en/department-of-housing-local-government-and-heritage/publications/government-reforms-to-the-rental-sector-starting-1-march-2026/)
- [CSO Consumer Price Index](https://www.cso.ie/en/statistics/prices/consumerpriceindex/)

Rules change. Before trusting this, check the sources above — and if you spot a rule that's moved,
the engine is small enough to fix in one file.

## Licence

MIT
