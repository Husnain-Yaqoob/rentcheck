import { addDays, daysBetween, elapsedMonths, formatIrishDate, parseIso, toIso } from "./dates";
import { marketResetPermitted } from "./regime";
import type { Check, DisputeDeadline, TenancyInput } from "./types";

/** A rent review notice must give at least this many days before the new rent applies. */
export const MIN_NOTICE_DAYS = 90;

/** Rent may be reviewed once every 12 months. */
export const MIN_REVIEW_INTERVAL_MONTHS = 12;

/**
 * From 14 September 2026 a landlord has 7 days to send the RTB its copy of the
 * notice. Before that date it had to go on the same day or the notice was
 * invalid. Notices served in the older window are judged on the older rule.
 */
export const RTB_SERVICE_WINDOW_CHANGED = "2026-09-14";

const RTB_NOTICE_FORM =
  "RTB Notice of Rent Review — https://rtb.ie/wp-content/uploads/2026/02/Notice-of-Rent-Review-Form_FINAL.pdf";

export function buildChecks(input: TenancyInput): Check[] {
  const checks: Check[] = [];
  const effective = parseIso(input.dateNewRentEffective);

  // --- 90 days' notice ----------------------------------------------------
  if (input.noticeReceived) {
    const received = parseIso(input.noticeReceived);
    const days = daysBetween(received, effective);
    checks.push({
      id: "notice-period",
      label: "At least 90 days' notice",
      status: days >= MIN_NOTICE_DAYS ? "pass" : "fail",
      fatal: true,
      detail:
        days >= MIN_NOTICE_DAYS
          ? `You received the notice ${days} days before the new rent is due to start, which meets the 90-day minimum.`
          : `You received the notice only ${days} days before the new rent is due to start. A rent review notice must give at least 90 days, so this notice does not appear to be valid.`,
      authority: RTB_NOTICE_FORM,
    });
  } else {
    checks.push({
      id: "notice-period",
      label: "At least 90 days' notice",
      status: "unknown",
      detail: "Tell us when you received the notice and we can check the 90-day requirement.",
      authority: RTB_NOTICE_FORM,
    });
  }

  // --- Review frequency ---------------------------------------------------
  const sinceLastSet = elapsedMonths(parseIso(input.dateRentLastSet), effective);
  checks.push({
    id: "review-frequency",
    label: "Not reviewed within the last 12 months",
    status: sinceLastSet >= MIN_REVIEW_INTERVAL_MONTHS ? "pass" : "fail",
    fatal: true,
    detail:
      sinceLastSet >= MIN_REVIEW_INTERVAL_MONTHS
        ? `The rent was last set ${sinceLastSet.toFixed(1)} months ago, so a review is due.`
        : `The rent was last set only ${sinceLastSet.toFixed(1)} months ago. Rent can normally be reviewed once every 12 months, so this review looks premature.`,
    authority:
      "Residential Tenancies Act 2004, s.19 — https://rtb.ie/renting/setting-and-reviewing-private-rents-from-1-march-2026/",
  });

  // --- Three comparables --------------------------------------------------
  checks.push({
    id: "comparables",
    label: "Three comparable properties listed",
    status: triStatus(input.noticeHasThreeComparables),
    fatal: true,
    detail:
      input.noticeHasThreeComparables === true
        ? "The notice lists three comparable dwellings, as Part C of the prescribed form requires."
        : input.noticeHasThreeComparables === false
          ? "The notice does not list three comparable dwellings. Part C of the prescribed form requires three, each with its registered tenancy number and rent, to show the new rent does not exceed market rent. Without them the notice is defective."
          : "Check Part C of the notice: it must name three comparable dwellings with their registered tenancy numbers and rents.",
    authority: RTB_NOTICE_FORM,
  });

  // --- RTB calculation ----------------------------------------------------
  checks.push({
    id: "rtb-calculation",
    label: "RTB rent calculation enclosed",
    status: triStatus(input.noticeHasRtbCalculation),
    detail:
      input.noticeHasRtbCalculation === true
        ? "The notice encloses the RTB rent calculation, as required."
        : input.noticeHasRtbCalculation === false
          ? "The notice does not enclose an RTB Rent Calculator printout. The prescribed form requires the calculation to be included."
          : "Check whether the notice encloses a printout from the RTB Rent Calculator.",
    authority: "https://rtb.ie/rtb-rent-calculator/",
  });

  // --- Rule relied on -----------------------------------------------------
  checks.push({
    id: "rule-stated",
    label: "States which rent rule is relied on",
    status: triStatus(input.noticeStatesRule),
    detail:
      input.noticeStatesRule === true
        ? "The notice states which rule it relies on, as Part B requires."
        : input.noticeStatesRule === false
          ? "The notice does not say which rule it relies on. Part B must identify whether the landlord is applying the 2%-or-CPI cap, the CPI-only rule for new apartments, or an exemption."
          : "Check Part B of the notice: it must say which rent rule the landlord is relying on.",
    authority: RTB_NOTICE_FORM,
  });

  // --- Service on the RTB -------------------------------------------------
  const servedUnderNewWindow = input.noticeReceived
    ? parseIso(input.noticeReceived) >= parseIso(RTB_SERVICE_WINDOW_CHANGED)
    : true;
  checks.push({
    id: "rtb-service",
    label: "Copy sent to the RTB",
    status: triStatus(input.noticeServedOnRtb),
    detail:
      input.noticeServedOnRtb === false
        ? servedUnderNewWindow
          ? "The landlord must send the RTB a copy of the notice within 7 days of serving it on you. If that was not done, the notice is defective."
          : "For notices served before 14 September 2026, the copy had to reach the RTB the same day it was served on the tenant, or the notice was invalid."
        : input.noticeServedOnRtb === true
          ? "A copy went to the RTB, as required."
          : "The landlord must also send the RTB a copy of the notice — within 7 days of serving it on you, for notices served from 14 September 2026.",
    authority: "https://rtb.ie/about/news/important-changes-to-rental-law-from-14-september-2026/",
  });

  // --- Exemption claim ----------------------------------------------------
  if (input.exemptionClaimed !== "none") {
    checks.push({
      id: "exemption",
      label: "Exemption claim stands up",
      status: "warn",
      detail: exemptionDetail(input.exemptionClaimed),
      authority: "https://rtb.ie/compliance/what-can-the-rtb-investigate/",
    });
  }

  // --- Market reset -------------------------------------------------------
  const reset = marketResetPermitted(input);
  if (reset.permitted !== null && input.previousTenancyEnding !== "notApplicable") {
    checks.push({
      id: "market-reset",
      label: "Reset to market rent was permitted",
      status: reset.permitted ? "pass" : "fail",
      fatal: !reset.permitted,
      detail: reset.reason,
      authority: "https://rtb.ie/renting/how-a-landlord-can-end-a-tenancy-from-1-march-2026/",
    });
  }

  return checks;
}

function triStatus(v: boolean | null | undefined): Check["status"] {
  if (v === true) return "pass";
  if (v === false) return "fail";
  return "unknown";
}

function exemptionDetail(claim: TenancyInput["exemptionClaimed"]): string {
  switch (claim) {
    case "substantialChange":
      return "A 'substantial change' exemption is only valid if the works did one of three things: permanently increased floor area by at least 25%, improved the BER by at least seven levels, or achieved at least three of the listed qualifying changes. Redecoration, new appliances or a new kitchen alone do not qualify. Falsely claiming renovations to justify an increase is expressly something the RTB investigates.";
    case "protectedStructure":
      return "This exemption applies only to a protected structure, or proposed protected structure, that was not let at any time in the previous year.";
    case "notLetTwoYears":
      return "This exemption applies only where the property was not let at any time in the previous two years.";
    default:
      return "The landlord is claiming an exemption. Ask which one, in writing — Part D of the notice must state the ground, and the landlord must have notified the RTB.";
  }
}

/**
 * A tenant must refer a dispute before the new rent becomes payable, or within
 * 28 days of receiving the notice, whichever is LATER.
 *
 * Where the notice is invalid there is no time limit at all — which is why an
 * apparently missed deadline is not the end of the road.
 */
export function disputeDeadline(input: TenancyInput, noticeLooksInvalid: boolean): DisputeDeadline {
  if (noticeLooksInvalid) {
    return {
      date: null,
      basis:
        "The notice appears to be invalid, and no time limit applies to challenging an invalid notice. You are not out of time.",
    };
  }

  const effective = parseIso(input.dateNewRentEffective);
  if (!input.noticeReceived) {
    return {
      date: toIso(effective),
      basis: `You must refer the dispute before the new rent becomes payable on ${formatIrishDate(effective)}, or within 28 days of receiving the notice if that is later.`,
    };
  }

  const plus28 = addDays(parseIso(input.noticeReceived), 28);
  const deadline = plus28 > effective ? plus28 : effective;
  return {
    date: toIso(deadline),
    basis:
      plus28 > effective
        ? `28 days from the date you received the notice, which is later than the date the new rent starts.`
        : `The date the new rent becomes payable, which is later than 28 days from receipt of the notice.`,
  };
}
