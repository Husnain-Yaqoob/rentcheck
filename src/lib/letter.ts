import { formatIrishDate } from "./dates";
import type { TenancyInput, Verdict } from "./types";

/**
 * Generates a letter the tenant can send to the landlord.
 *
 * Deliberately measured in tone. The aim is to get the rent corrected without
 * a dispute, so the letter states the position, cites the rule, and invites
 * correction — it does not accuse anyone of anything.
 */
export function buildLetter(input: TenancyInput, verdict: Verdict, address = "[your address]"): string {
  const today = formatIrishDate(new Date().toISOString().slice(0, 10));
  const effective = formatIrishDate(input.dateNewRentEffective);
  const lines: string[] = [];

  lines.push(address, "", today, "", "Dear Landlord,", "");
  lines.push(
    `Re: Proposed rent review with effect from ${effective}`,
    "",
    "Thank you for your notice of rent review. I have checked the proposed increase against the rent setting rules in section 19 of the Residential Tenancies Act 2004, as amended by the Residential Tenancies (Miscellaneous Provisions) Act 2026, and I believe there is a problem with it. I am writing so that it can be corrected without either of us needing to involve the Residential Tenancies Board.",
    "",
  );

  const fatal = verdict.checks.filter((c) => c.fatal && c.status === "fail");
  if (fatal.length > 0) {
    lines.push("My concerns about the notice itself are:", "");
    for (const c of fatal) lines.push(`  - ${c.detail}`);
    lines.push("");
  }

  if (verdict.overchargePerMonth !== null && verdict.overchargePerMonth > 0.5) {
    const cap = verdict.cap;
    lines.push(
      "On the calculation, my understanding is as follows:",
      "",
      `  Current rent:                  EUR ${cap.oldRent.toFixed(2)}`,
      `  Rent last set:                 ${formatIrishDate(input.dateRentLastSet)}`,
      `  New rent to take effect:       ${effective}`,
      `  Period elapsed:                ${cap.elapsedMonths.toFixed(1)} months`,
    );
    if (cap.percentLimb.applies) {
      lines.push(
        `  2% limb (pro-rata):            EUR ${cap.percentLimb.maxRent?.toFixed(2)} (${cap.percentLimb.percent?.toFixed(2)}%)`,
      );
    }
    if (cap.cpiLimb.applies) {
      lines.push(
        `  CPI limb:                      EUR ${cap.cpiLimb.maxRent?.toFixed(2)} (${cap.cpiLimb.percent?.toFixed(2)}%)`,
      );
    }
    lines.push(
      `  Maximum lawful rent:           EUR ${cap.maxLegalRent?.toFixed(2)}`,
      `  Rent proposed:                 EUR ${input.proposedRent?.toFixed(2)}`,
      `  Difference:                    EUR ${verdict.overchargePerMonth.toFixed(2)} per month`,
      "",
      "Section 19 sets a dual test: the new rent may exceed neither 2% per annum apportioned over the elapsed period, nor the movement in the Consumer Price Index over the same period. The lower of the two governs.",
      "",
    );
  }

  lines.push(
    `On that basis I believe the maximum rent lawfully payable from ${effective} is EUR ${verdict.cap.maxLegalRent?.toFixed(2) ?? "[amount]"} per month.`,
    "",
    "Could you please confirm in writing either that the rent will be set at that figure, or your own calculation showing how the proposed figure was arrived at? I would rather resolve this between us.",
    "",
    "I should say that I intend to continue paying rent as normal throughout, and that nothing in this letter is intended as a refusal to pay.",
    "",
    "Yours sincerely,",
    "",
    "",
    "[your name]",
  );

  return lines.join("\n");
}
