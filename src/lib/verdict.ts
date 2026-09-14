import { calculateCap } from "./cap";
import { formatIrishDate } from "./dates";
import { euro } from "./format";
import { buildChecks, disputeDeadline } from "./notice";
import { determineRegime } from "./regime";
import type { TenancyInput, Verdict } from "./types";

/**
 * Pulls the pieces together into the single answer a user actually wants:
 * is this increase legal, by how much is it out, and what do I do now.
 */
export function assess(input: TenancyInput): Verdict {
  const cap = calculateCap(input);
  const regime = determineRegime(input);
  const checks = buildChecks(input);

  const fatalFailure = checks.some((c) => c.fatal && c.status === "fail");
  const deadline = disputeDeadline(input, fatalFailure);

  const proposed = input.proposedRent;
  const overcharge =
    proposed !== null && cap.maxLegalRent !== null
      ? Math.round((proposed - cap.maxLegalRent) * 100) / 100
      : null;

  let outcome: Verdict["outcome"];
  let headline: string;
  let summary: string;

  if (fatalFailure) {
    outcome = "likely-unlawful";
    const failed = checks.filter((c) => c.fatal && c.status === "fail");
    headline = "This rent increase does not look valid";
    summary =
      failed.length === 1
        ? `The notice fails a requirement that goes to its validity: ${failed[0].label.toLowerCase()}. An invalid notice cannot raise your rent, and there is no time limit on challenging one.`
        : `The notice fails ${failed.length} requirements that go to its validity. An invalid notice cannot raise your rent, and there is no time limit on challenging one.`;
  } else if (overcharge !== null && overcharge > 0.5) {
    outcome = "likely-unlawful";
    headline = `The proposed rent is ${euro(overcharge)} a month above the cap`;
    summary = `The most your landlord can lawfully charge from ${formatIrishDate(input.dateNewRentEffective)} is ${euro(cap.maxLegalRent)}. The proposed ${euro(proposed)} exceeds that by ${euro(overcharge)} a month, or ${euro(overcharge * 12)} over a year.`;
  } else if (cap.provisional) {
    outcome = "cannot-determine";
    headline = "Partly checked — the inflation limb is missing";
    summary = `Against the 2% limb alone, the ceiling is ${euro(cap.percentLimb.maxRent)}. The true cap is the lower of that and the CPI figure, which could not be applied here, so the real limit may be lower. Check the same dates on the RTB Rent Calculator to complete the picture.`;
  } else if (overcharge !== null) {
    outcome = "likely-lawful";
    headline = "This increase appears to be within the cap";
    summary = `The maximum lawful rent from ${formatIrishDate(input.dateNewRentEffective)} is ${euro(cap.maxLegalRent)}, and the proposed ${euro(proposed)} is within that. Remember the cap is a ceiling, not an entitlement — the rent must also not exceed market rent for comparable properties.`;
  } else {
    outcome = "cannot-determine";
    headline = `The cap works out at ${euro(cap.maxLegalRent)} a month`;
    summary =
      "Enter the rent your landlord is proposing and we will tell you whether it is over the line.";
  }

  return {
    outcome,
    headline,
    summary,
    cap,
    regime,
    checks,
    overchargePerMonth: overcharge,
    disputeDeadline: deadline,
  };
}
