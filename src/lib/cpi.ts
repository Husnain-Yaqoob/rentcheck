import table from "../../data/cpi-index.json";
import { parseIso, precedingMonthKey } from "./dates";
import type { CpiReading, IsoDate } from "./types";

/**
 * The CPI table is data, not code. It ships empty and is populated by
 * `npm run fetch:cpi` from the CSO. Nothing here invents an index number:
 * if the table has no value for a month, we say so and fall back.
 */

interface CpiTable {
  series: string;
  label: string;
  base: string;
  source: string;
  fetchedAt: string | null;
  values: Record<string, number>;
}

const cpi = table as CpiTable;

export const cpiMeta = {
  series: cpi.series,
  label: cpi.label,
  base: cpi.base,
  source: cpi.source,
  fetchedAt: cpi.fetchedAt,
};

export function isCpiLoaded(): boolean {
  return Object.keys(cpi.values).length > 0;
}

export function cpiCoverage(): { first: string; last: string } | null {
  const months = Object.keys(cpi.values).sort();
  if (months.length === 0) return null;
  return { first: months[0], last: months[months.length - 1] };
}

/**
 * Which month's index applies to a given rent-setting date.
 *
 * IMPORTANT — see README "Known uncertainties". Under the HICP predecessor the
 * statute compared the index for the month immediately preceding each rent
 * setting, and the RTB's own calculator takes the two rent-setting dates as its
 * inputs. We follow the month-preceding convention, but it is deliberately
 * isolated in this one function so it can be corrected in a single place if
 * validation against the RTB calculator shows otherwise.
 *
 * CPI is published with roughly a ten-day lag, so an off-by-one month here
 * silently produces a wrong legal figure. Do not change this without re-running
 * the comparison in `npm test`.
 */
export function indexMonthFor(date: IsoDate): string {
  return precedingMonthKey(parseIso(date));
}

export function readCpi(date: IsoDate): CpiReading | null {
  const month = indexMonthFor(date);
  const value = cpi.values[month];
  return typeof value === "number" ? { month, value } : null;
}
