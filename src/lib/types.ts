/**
 * Domain types for the Irish rent increase legality checker.
 *
 * Everything here describes the position under the Residential Tenancies Act
 * 2004 as amended, in particular by the Residential Tenancies (Miscellaneous
 * Provisions) Act 2026 (No. 3 of 2026), which commenced on 1 March 2026.
 */

/** A calendar date with no time component, as "YYYY-MM-DD". */
export type IsoDate = string;

/**
 * Landlord size decides which termination grounds are available, and so
 * whether a market-rent reset was lawfully open to the landlord at all.
 *
 * Note the trap: a registered company is a "larger" landlord even if it holds
 * a single tenancy.
 */
export type LandlordSize = "smaller" | "larger" | "unknown";

/**
 * New apartments and student-specific accommodation whose commencement notice
 * was filed on or after 10 June 2025 are capped by CPI alone — the 2% ceiling
 * does not apply to them, so their rent can rise faster than 2% when inflation
 * is higher.
 */
export type PropertyClass = "standard" | "newApartmentOrSSA";

export type ExemptionClaim =
  | "none"
  | "substantialChange"
  | "protectedStructure"
  | "notLetTwoYears"
  | "other";

/** How the previous tenancy ended — decides whether a market reset was allowed. */
export type PreviousTenancyEnding =
  | "notApplicable"
  | "tenantLeftVoluntarily"
  | "tenantBreached"
  | "landlordSale"
  | "landlordOrFamilyOccupation"
  | "refurbishment"
  | "changeOfUse"
  | "unknown";

export type CheckStatus = "pass" | "fail" | "warn" | "unknown";

export interface Check {
  id: string;
  /** Short label for the checklist row. */
  label: string;
  status: CheckStatus;
  /** Plain-English explanation shown under the label. */
  detail: string;
  /** Where the rule comes from, so a user can verify it themselves. */
  authority?: string;
  /** True where failing this check makes the notice invalid outright. */
  fatal?: boolean;
}

export interface CpiReading {
  /** "YYYY-MM" */
  month: string;
  value: number;
}

export interface CapLimb {
  applies: boolean;
  maxRent: number | null;
  /** The permitted increase expressed as a percentage of the old rent. */
  percent: number | null;
  explanation: string;
}

export interface CapResult {
  oldRent: number;
  /** Elapsed period between the last rent setting and the new rent taking effect. */
  elapsedMonths: number;
  elapsedYears: number;
  percentLimb: CapLimb;
  cpiLimb: CapLimb & { previous?: CpiReading; current?: CpiReading; ratio?: number };
  /** Which limb actually binds. "none" when we lack the data to say. */
  binding: "percent" | "cpi" | "none";
  /** The maximum lawful rent, or null when CPI data is missing and so unknowable. */
  maxLegalRent: number | null;
  /** True when we could only apply the 2% limb, so the real cap may be lower. */
  provisional: boolean;
  notes: string[];
}

export interface TenancyInput {
  currentRent: number;
  proposedRent: number | null;
  dateRentLastSet: IsoDate;
  dateNewRentEffective: IsoDate;
  tenancyStart: IsoDate;
  propertyClass: PropertyClass;
  exemptionClaimed: ExemptionClaim;
  landlordSize: LandlordSize;
  previousTenancyEnding: PreviousTenancyEnding;

  /* Notice particulars — all optional, because a user may not have the notice to hand. */
  noticeReceived?: IsoDate | null;
  noticeHasThreeComparables?: boolean | null;
  noticeHasRtbCalculation?: boolean | null;
  noticeStatesRule?: boolean | null;
  noticeServedOnRtb?: boolean | null;

  /** Hand-entered CPI values, used when the CSO table has not been fetched. */
  manualCpi?: { previous: number; current: number } | null;
}

export interface Verdict {
  /** The headline. */
  outcome: "likely-unlawful" | "likely-lawful" | "cannot-determine";
  headline: string;
  summary: string;
  cap: CapResult;
  regime: RegimeResult;
  checks: Check[];
  /** Amount the proposed rent exceeds the cap by, per month. Null if unknown. */
  overchargePerMonth: number | null;
  disputeDeadline: DisputeDeadline;
}

export interface RegimeResult {
  /** Structural rules (tenancy length, termination grounds) follow the start date. */
  structural: "pre-march-2026" | "from-march-2026";
  /** Whether a six-yearly market-rent reset can ever apply to this tenancy. */
  marketResetPossible: boolean;
  notes: string[];
}

export interface DisputeDeadline {
  /** Null when the notice appears invalid — no time limit applies in that case. */
  date: IsoDate | null;
  basis: string;
}
