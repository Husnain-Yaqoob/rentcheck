import { describe, expect, it } from "vitest";
import { buildChecks, disputeDeadline } from "./notice";
import { determineRegime, marketResetPermitted } from "./regime";
import { assess } from "./verdict";
import type { TenancyInput } from "./types";

function input(overrides: Partial<TenancyInput> = {}): TenancyInput {
  return {
    currentRent: 1500,
    proposedRent: 1600,
    dateRentLastSet: "2025-06-01",
    dateNewRentEffective: "2026-06-01",
    tenancyStart: "2023-04-01",
    propertyClass: "standard",
    exemptionClaimed: "none",
    landlordSize: "unknown",
    previousTenancyEnding: "notApplicable",
    manualCpi: { previous: 100, current: 103 },
    ...overrides,
  };
}

const find = (checks: ReturnType<typeof buildChecks>, id: string) => {
  const c = checks.find((x) => x.id === id);
  if (!c) throw new Error(`no check with id ${id}`);
  return c;
};

describe("90-day notice requirement", () => {
  it("passes when 90 or more days are given", () => {
    const checks = buildChecks(input({ noticeReceived: "2026-03-01" }));
    expect(find(checks, "notice-period").status).toBe("pass");
  });

  it("fails when fewer than 90 days are given", () => {
    const checks = buildChecks(input({ noticeReceived: "2026-04-15" }));
    const check = find(checks, "notice-period");
    expect(check.status).toBe("fail");
    expect(check.fatal).toBe(true);
  });

  it("is unknown when we were not told the receipt date", () => {
    const checks = buildChecks(input({ noticeReceived: null }));
    expect(find(checks, "notice-period").status).toBe("unknown");
  });
});

describe("review frequency", () => {
  it("fails a review inside twelve months", () => {
    const checks = buildChecks(
      input({ dateRentLastSet: "2026-01-01", dateNewRentEffective: "2026-06-01" }),
    );
    expect(find(checks, "review-frequency").status).toBe("fail");
  });

  it("passes a review at exactly twelve months", () => {
    const checks = buildChecks(
      input({ dateRentLastSet: "2025-06-01", dateNewRentEffective: "2026-06-01" }),
    );
    expect(find(checks, "review-frequency").status).toBe("pass");
  });
});

describe("market rent reset after a no-fault eviction", () => {
  it("is not permitted where the previous tenancy ended for sale", () => {
    expect(marketResetPermitted(input({ previousTenancyEnding: "landlordSale" })).permitted).toBe(
      false,
    );
  });

  it("is not permitted after termination for owner or family occupation", () => {
    expect(
      marketResetPermitted(input({ previousTenancyEnding: "landlordOrFamilyOccupation" })).permitted,
    ).toBe(false);
  });

  it("is permitted where the previous tenant left voluntarily", () => {
    expect(
      marketResetPermitted(input({ previousTenancyEnding: "tenantLeftVoluntarily" })).permitted,
    ).toBe(true);
  });

  it("surfaces as a fatal check on the notice", () => {
    const checks = buildChecks(input({ previousTenancyEnding: "refurbishment" }));
    const check = find(checks, "market-reset");
    expect(check.status).toBe("fail");
    expect(check.fatal).toBe(true);
  });
});

describe("regime determination", () => {
  it("treats a tenancy started before 1 March 2026 as grandfathered", () => {
    const regime = determineRegime(input({ tenancyStart: "2026-02-28" }));
    expect(regime.structural).toBe("pre-march-2026");
    expect(regime.marketResetPossible).toBe(false);
  });

  it("treats a tenancy started on 1 March 2026 as under the new structure", () => {
    const regime = determineRegime(input({ tenancyStart: "2026-03-01" }));
    expect(regime.structural).toBe("from-march-2026");
    expect(regime.marketResetPossible).toBe(true);
  });

  it("applies the cap to old tenancies regardless of structural regime", () => {
    const regime = determineRegime(input({ tenancyStart: "2019-01-01" }));
    expect(regime.notes.join(" ")).toMatch(/applies to every tenancy/i);
  });
});

describe("dispute deadline", () => {
  it("is the later of the effective date and 28 days from receipt", () => {
    const result = disputeDeadline(
      input({ noticeReceived: "2026-05-20", dateNewRentEffective: "2026-06-01" }),
      false,
    );
    // 20 May + 28 days = 17 June, which is later than 1 June.
    expect(result.date).toBe("2026-06-17");
  });

  it("falls back to the effective date when that is later", () => {
    const result = disputeDeadline(
      input({ noticeReceived: "2026-01-10", dateNewRentEffective: "2026-06-01" }),
      false,
    );
    expect(result.date).toBe("2026-06-01");
  });

  it("has no deadline at all where the notice is invalid", () => {
    const result = disputeDeadline(input({ noticeReceived: "2020-01-01" }), true);
    expect(result.date).toBeNull();
    expect(result.basis).toMatch(/no time limit/i);
  });
});

describe("overall verdict", () => {
  it("calls out an overcharge in euro", () => {
    const verdict = assess(
      input({
        currentRent: 1500,
        proposedRent: 1600,
        manualCpi: { previous: 100, current: 103 },
        noticeReceived: "2026-01-15",
        noticeHasThreeComparables: true,
        noticeHasRtbCalculation: true,
        noticeStatesRule: true,
        noticeServedOnRtb: true,
      }),
    );

    // 2% limb: 1530. CPI limb: 1545. The 2% limb binds.
    expect(verdict.cap.maxLegalRent).toBeCloseTo(1530, 2);
    expect(verdict.overchargePerMonth).toBeCloseTo(70, 2);
    expect(verdict.outcome).toBe("likely-unlawful");
  });

  it("passes an increase inside the cap", () => {
    const verdict = assess(
      input({
        currentRent: 1500,
        proposedRent: 1525,
        noticeReceived: "2026-01-15",
        noticeHasThreeComparables: true,
        noticeHasRtbCalculation: true,
        noticeStatesRule: true,
        noticeServedOnRtb: true,
      }),
    );
    expect(verdict.outcome).toBe("likely-lawful");
  });

  it("lets an invalid notice override an otherwise lawful figure", () => {
    const verdict = assess(
      input({
        currentRent: 1500,
        proposedRent: 1525,
        noticeReceived: "2026-05-01", // only 31 days' notice
        noticeHasThreeComparables: true,
        noticeHasRtbCalculation: true,
        noticeStatesRule: true,
        noticeServedOnRtb: true,
      }),
    );
    expect(verdict.outcome).toBe("likely-unlawful");
    expect(verdict.disputeDeadline.date).toBeNull();
  });

  it("refuses to give a firm answer when CPI data is missing", () => {
    const verdict = assess(input({ manualCpi: null, proposedRent: 1525 }));
    expect(verdict.outcome).toBe("cannot-determine");
    expect(verdict.cap.provisional).toBe(true);
  });
});
