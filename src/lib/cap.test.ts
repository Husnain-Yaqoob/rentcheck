import { describe, expect, it, vi } from "vitest";
import { calculateCap } from "./cap";
import { elapsedMonths, parseIso } from "./dates";
import type { TenancyInput } from "./types";

// The "missing CPI data" tests need an empty table; pin it rather than depend on
// whatever `npm run fetch:cpi` last wrote.
vi.mock("../../data/cpi-index.json", () => ({
  default: { series: "test", label: "", base: "", source: "", fetchedAt: null, values: {} },
}));

/**
 * The three worked examples below are taken from the official government
 * guidance on the Residential Tenancies (Amendment) Act 2021, published by the
 * RTB. They are the closest thing to a reference implementation we have, so
 * they are the backbone of this suite.
 *
 * The guidance predates the switch from HICP to CPI, but the arithmetic of the
 * dual test is unchanged — only which index feeds limb (b) changed. We inject
 * the index movement directly via `manualCpi` so the examples remain valid.
 *
 * Source: RTB / DHLGH guidance, 13 December 2021
 * https://www.rtb.ie/wp-content/uploads/2025/06/Government_Guidance_Residential_Tenancies_Amendment_Act_2021_V2_13_Dec_21.pdf
 */

function input(overrides: Partial<TenancyInput> = {}): TenancyInput {
  return {
    currentRent: 1000,
    proposedRent: null,
    dateRentLastSet: "2024-01-01",
    dateNewRentEffective: "2025-01-01",
    tenancyStart: "2020-01-01",
    propertyClass: "standard",
    exemptionClaimed: "none",
    landlordSize: "unknown",
    previousTenancyEnding: "notApplicable",
    manualCpi: null,
    ...overrides,
  };
}

describe("official RTB worked examples", () => {
  it("example 1: €1,800 over 12 months with 5.2% inflation is capped at €36 by the 2% limb", () => {
    const result = calculateCap(
      input({
        currentRent: 1800,
        dateRentLastSet: "2024-01-01",
        dateNewRentEffective: "2025-01-01",
        manualCpi: { previous: 100, current: 105.2 },
      }),
    );

    expect(result.binding).toBe("percent");
    expect(result.maxLegalRent).toBeCloseTo(1836, 2);
    expect(result.maxLegalRent! - result.oldRent).toBeCloseTo(36, 2);
  });

  it("example 2: €1,400 over 5 years with 6.6% cumulative inflation is capped at ~€92 by the CPI limb", () => {
    const result = calculateCap(
      input({
        currentRent: 1400,
        dateRentLastSet: "2020-01-01",
        dateNewRentEffective: "2025-01-01",
        manualCpi: { previous: 100, current: 106.6 },
      }),
    );

    // The 2% limb allows 10% over five years (€1,540); inflation is the lower
    // of the two and therefore binds.
    expect(result.binding).toBe("cpi");
    expect(result.percentLimb.maxRent).toBeCloseTo(1540, 2);
    expect(result.maxLegalRent).toBeCloseTo(1492.4, 2);
    expect(Math.round(result.maxLegalRent! - result.oldRent)).toBe(92);
  });

  it("example 3: €813 over 2 years with 13.1% inflation is capped at 4% (~€33)", () => {
    const result = calculateCap(
      input({
        currentRent: 813,
        dateRentLastSet: "2023-01-01",
        dateNewRentEffective: "2025-01-01",
        manualCpi: { previous: 100, current: 113.1 },
      }),
    );

    expect(result.binding).toBe("percent");
    expect(result.percentLimb.percent).toBeCloseTo(4, 6);
    expect(Math.round(result.maxLegalRent! - result.oldRent)).toBe(33);
  });
});

describe("the percentage limb is apportioned, not rounded to whole years", () => {
  it("allows 1% over six months", () => {
    const result = calculateCap(
      input({
        currentRent: 2000,
        dateRentLastSet: "2025-01-01",
        dateNewRentEffective: "2025-07-01",
      }),
    );
    expect(result.percentLimb.percent).toBeCloseTo(1, 6);
    expect(result.percentLimb.maxRent).toBeCloseTo(2020, 2);
  });

  it("allows 3% over eighteen months", () => {
    const result = calculateCap(
      input({
        currentRent: 2000,
        dateRentLastSet: "2024-01-01",
        dateNewRentEffective: "2025-07-01",
      }),
    );
    expect(result.percentLimb.percent).toBeCloseTo(3, 6);
  });
});

describe("the CPI limb is not apportioned", () => {
  it("uses the whole-period index movement even over a long gap", () => {
    const result = calculateCap(
      input({
        currentRent: 1000,
        dateRentLastSet: "2021-01-01",
        dateNewRentEffective: "2025-01-01",
        // 4 years elapsed: the 2% limb allows 8%, inflation ran at 3%.
        manualCpi: { previous: 100, current: 103 },
      }),
    );
    expect(result.percentLimb.percent).toBeCloseTo(8, 6);
    expect(result.cpiLimb.percent).toBeCloseTo(3, 6);
    expect(result.binding).toBe("cpi");
    expect(result.maxLegalRent).toBeCloseTo(1030, 2);
  });
});

describe("new apartment and SSA carve-out", () => {
  it("drops the 2% ceiling so CPI alone governs, even above 2%", () => {
    const result = calculateCap(
      input({
        currentRent: 1000,
        propertyClass: "newApartmentOrSSA",
        dateRentLastSet: "2024-01-01",
        dateNewRentEffective: "2025-01-01",
        manualCpi: { previous: 100, current: 104 },
      }),
    );

    expect(result.percentLimb.applies).toBe(false);
    expect(result.binding).toBe("cpi");
    // A standard property would have been held to €1,020 here.
    expect(result.maxLegalRent).toBeCloseTo(1040, 2);
  });
});

describe("missing CPI data", () => {
  it("falls back to the 2% limb and flags the answer as provisional", () => {
    const result = calculateCap(
      input({ currentRent: 1500, manualCpi: null }),
    );

    expect(result.cpiLimb.applies).toBe(false);
    expect(result.provisional).toBe(true);
    expect(result.maxLegalRent).toBeCloseTo(1530, 2);
    expect(result.notes.join(" ")).toMatch(/only the 2% limb|does not cover/i);
  });

  it("never silently invents an index value", () => {
    const result = calculateCap(input({ manualCpi: null }));
    expect(result.cpiLimb.maxRent).toBeNull();
    expect(result.cpiLimb.ratio).toBeUndefined();
  });
});

describe("elapsedMonths", () => {
  it("counts whole months exactly", () => {
    expect(elapsedMonths(parseIso("2025-01-01"), parseIso("2026-01-01"))).toBeCloseTo(12, 9);
    expect(elapsedMonths(parseIso("2025-01-31"), parseIso("2025-02-28"))).toBeCloseTo(1, 9);
  });

  it("returns zero when the end date is not after the start", () => {
    expect(elapsedMonths(parseIso("2025-06-01"), parseIso("2025-06-01"))).toBe(0);
    expect(elapsedMonths(parseIso("2025-06-01"), parseIso("2025-05-01"))).toBe(0);
  });

  it("clamps month-end dates instead of overflowing", () => {
    // Regression: JavaScript's native setMonth turns 31 Jan + 1 month into
    // 3 March, which would overstate the elapsed period for any rent set on
    // the 29th, 30th or 31st.
    expect(elapsedMonths(parseIso("2025-01-31"), parseIso("2025-02-28"))).toBeCloseTo(1, 9);
    expect(elapsedMonths(parseIso("2024-01-31"), parseIso("2024-02-29"))).toBeCloseTo(1, 9);
    expect(elapsedMonths(parseIso("2025-03-31"), parseIso("2026-03-31"))).toBeCloseTo(12, 9);
  });

  it("apportions a partial month", () => {
    const half = elapsedMonths(parseIso("2025-01-01"), parseIso("2025-01-16"));
    expect(half).toBeGreaterThan(0.4);
    expect(half).toBeLessThan(0.6);
  });
});
