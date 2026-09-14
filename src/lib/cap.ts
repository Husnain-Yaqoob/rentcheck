import { elapsedMonths, parseIso } from "./dates";
import { isCpiLoaded, readCpi } from "./cpi";
import type { CapResult, TenancyInput } from "./types";

/** The percentage limb: 2% per annum, apportioned across the elapsed period. */
export const ANNUAL_PERCENT_CAP = 0.02;

/** Commencement of the national rent control regime. */
export const NATIONAL_RENT_CONTROL_START = "2026-03-01";

/**
 * New apartments and student-specific accommodation with a commencement notice
 * filed on or after this date are capped by CPI alone.
 */
export const NEW_BUILD_CARVE_OUT_FROM = "2025-06-10";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The dual test in section 19 of the Residential Tenancies Act 2004.
 *
 * Both limbs must be satisfied, so the binding cap is the LOWER of:
 *
 *   (a) old rent x (1 + 0.02 x elapsed_years)     — pro-rated by time
 *   (b) old rent x (CPI_current / CPI_previous)   — NOT pro-rated
 *
 * Limb (b) is the actual movement in the index across the whole period, which
 * is why a long gap can leave the CPI limb binding even though the percentage
 * allowance has grown large.
 *
 * For new apartments and SSA within the carve-out, limb (a) does not apply at
 * all and CPI alone governs — so those rents can lawfully rise by more than 2%.
 */
export function calculateCap(input: TenancyInput): CapResult {
  const from = parseIso(input.dateRentLastSet);
  const to = parseIso(input.dateNewRentEffective);
  const months = elapsedMonths(from, to);
  const years = months / 12;
  const notes: string[] = [];

  const percentApplies = input.propertyClass !== "newApartmentOrSSA";
  const percentAllowance = ANNUAL_PERCENT_CAP * years;
  const percentMax = round2(input.currentRent * (1 + percentAllowance));

  if (!percentApplies) {
    notes.push(
      "The 2% ceiling does not apply to new apartments or student-specific accommodation whose commencement notice was filed on or after 10 June 2025. CPI alone governs, so the rent can lawfully rise by more than 2%.",
    );
  }

  const percentLimb = {
    applies: percentApplies,
    maxRent: percentApplies ? percentMax : null,
    percent: percentApplies ? percentAllowance * 100 : null,
    explanation: percentApplies
      ? `2% per year apportioned over ${months.toFixed(1)} months gives an allowance of ${(percentAllowance * 100).toFixed(2)}%.`
      : "Not applicable to this property class.",
  };

  // --- CPI limb -----------------------------------------------------------
  let previous = readCpi(input.dateRentLastSet);
  let current = readCpi(input.dateNewRentEffective);

  if (input.manualCpi) {
    previous = { month: "entered by hand", value: input.manualCpi.previous };
    current = { month: "entered by hand", value: input.manualCpi.current };
    notes.push("CPI index values were entered by hand rather than read from the CSO table.");
  }

  const haveCpi = previous !== null && current !== null && previous.value > 0;
  const ratio = haveCpi ? current!.value / previous!.value : undefined;
  const cpiMax = haveCpi ? round2(input.currentRent * ratio!) : null;

  if (!haveCpi) {
    notes.push(
      isCpiLoaded()
        ? "The CPI table does not cover one of these dates, so the inflation limb could not be applied."
        : "The CPI table has not been fetched yet (run `npm run fetch:cpi`), so only the 2% limb was applied.",
    );
  }

  const cpiLimb = {
    applies: haveCpi,
    maxRent: cpiMax,
    percent: ratio !== undefined ? (ratio - 1) * 100 : null,
    explanation: haveCpi
      ? `CPI moved from ${previous!.value} (${previous!.month}) to ${current!.value} (${current!.month}), a change of ${(((ratio ?? 1) - 1) * 100).toFixed(2)}%.`
      : "Inflation limb not applied — index values unavailable.",
    previous: previous ?? undefined,
    current: current ?? undefined,
    ratio,
  };

  // --- Which limb binds ---------------------------------------------------
  let binding: CapResult["binding"] = "none";
  let maxLegalRent: number | null = null;

  if (percentLimb.applies && cpiLimb.applies) {
    binding = percentMax <= cpiMax! ? "percent" : "cpi";
    maxLegalRent = Math.min(percentMax, cpiMax!);
  } else if (percentLimb.applies) {
    binding = "percent";
    maxLegalRent = percentMax;
  } else if (cpiLimb.applies) {
    binding = "cpi";
    maxLegalRent = cpiMax;
  }

  // Provisional when the answer could still move down once CPI is known.
  const provisional = percentLimb.applies && !cpiLimb.applies;

  notes.push(
    "Separately from this cap, rent may never exceed market rent for comparable properties. The cap is a ceiling, not an entitlement.",
  );

  return {
    oldRent: input.currentRent,
    elapsedMonths: months,
    elapsedYears: years,
    percentLimb,
    cpiLimb,
    binding,
    maxLegalRent,
    provisional,
    notes,
  };
}
