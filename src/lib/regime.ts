import { parseIso } from "./dates";
import { NATIONAL_RENT_CONTROL_START } from "./cap";
import type { RegimeResult, TenancyInput } from "./types";

/**
 * The 1 March 2026 reforms split into two packages that apply differently, and
 * conflating them is the single most common misunderstanding:
 *
 *   The rent CAP (CPI or 2%, whichever is lower) applies to every tenancy from
 *   1 March 2026 — old and new alike.
 *
 *   The STRUCTURAL reforms — rolling six-year Tenancies of Minimum Duration,
 *   the smaller/larger landlord termination split, and the right to reset to
 *   market rent at the end of a six-year cycle — apply only to tenancies
 *   created on or after 1 March 2026. Existing tenancies are grandfathered
 *   permanently, not transitionally: they never migrate.
 */
export function determineRegime(input: TenancyInput): RegimeResult {
  const start = parseIso(input.tenancyStart);
  const cutover = parseIso(NATIONAL_RENT_CONTROL_START);
  const isNew = start >= cutover;
  const notes: string[] = [];

  if (isNew) {
    notes.push(
      "This tenancy began on or after 1 March 2026, so it is a tenancy of minimum duration running in rolling six-year cycles.",
    );
    notes.push(
      "At the end of a six-year cycle the landlord may reset the rent to market rent — but only if the rent is currently below market rent, and never following a no-fault eviction.",
    );
  } else {
    notes.push(
      "This tenancy began before 1 March 2026, so the older termination rules under sections 34 and 35 continue to apply to it.",
    );
    notes.push(
      "There is no six-yearly reset to market rent for a tenancy of this vintage. A landlord claiming one is mistaken.",
    );
  }

  notes.push(
    "The rent cap itself — CPI or 2%, whichever is lower — applies to every tenancy from 1 March 2026 regardless of when it began.",
  );

  if (input.landlordSize === "larger") {
    notes.push(
      "A larger landlord (four or more tenancies, or any registered company) cannot end a tenancy of minimum duration for sale, own or family occupation, refurbishment, or change of use.",
    );
  }

  return {
    structural: isNew ? "from-march-2026" : "pre-march-2026",
    marketResetPossible: isNew,
    notes,
  };
}

/**
 * Anti-avoidance: a landlord may not reset to market rent after a no-fault
 * eviction. This is the provision that blocks economic eviction, and it is the
 * most valuable thing this app can surface, because the arithmetic looks
 * perfectly fine while the reset itself was never permitted.
 */
export function marketResetPermitted(input: TenancyInput): {
  permitted: boolean | null;
  reason: string;
} {
  switch (input.previousTenancyEnding) {
    case "tenantLeftVoluntarily":
      return {
        permitted: true,
        reason:
          "The previous tenant left voluntarily, so a reset to market rent was open to the landlord — provided the old rent was below market rent.",
      };
    case "tenantBreached":
      return {
        permitted: true,
        reason:
          "The previous tenancy ended through tenant breach, which is one of the grounds permitting a market-rent reset.",
      };
    case "landlordSale":
    case "landlordOrFamilyOccupation":
    case "refurbishment":
    case "changeOfUse":
      return {
        permitted: false,
        reason:
          "The previous tenancy ended on a no-fault ground. A landlord may not reset the rent to market rent after a no-fault eviction, and the former tenant may also have a right of first refusal on the re-let.",
      };
    case "notApplicable":
      return {
        permitted: null,
        reason: "This is a rent review within a continuing tenancy, not a re-let, so no reset applies.",
      };
    default:
      return {
        permitted: null,
        reason: "How the previous tenancy ended is unknown, so whether a reset was permitted cannot be assessed.",
      };
  }
}
