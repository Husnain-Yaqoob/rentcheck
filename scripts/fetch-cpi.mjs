#!/usr/bin/env node
/**
 * Populates data/cpi-index.json from the CSO's PxStat API.
 *
 * Series CPM24 — Consumer Price Index, All Items, base December 2023 = 100.
 * This is the index the Residential Tenancies (Miscellaneous Provisions) Act 2026
 * points at: section 8 substitutes "CPI number" for "HICP value" throughout
 * section 19 of the 2004 Act, and defines the CPI number as the All Items
 * Consumer Price Index compiled and published by the CSO.
 *
 * Run monthly — the CSO publishes with roughly a ten-day lag.
 *
 *   npm run fetch:cpi
 */

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TARGET = path.join(ROOT, "data", "cpi-index.json");

const API =
  "https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/CPM24/JSON-stat/2.0/en";

/** Turn a CSO time code (e.g. "202608" or "2026M08") into "2026-08". */
function normaliseMonth(code) {
  const digits = String(code).replace(/[^0-9]/g, "");
  if (digits.length !== 6) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
}

/**
 * JSON-stat 2.0 stores values in a flat array indexed by the product of all
 * dimension sizes. We want the "All Items" statistic across every time period,
 * so we locate the index of each dimension and walk the cube accordingly.
 */
function extractAllItems(cube) {
  const dimIds = cube.id ?? cube.dimension?.id;
  const sizes = cube.size ?? cube.dimension?.size;
  if (!dimIds || !sizes) throw new Error("Unexpected JSON-stat shape: no dimension list");

  const timeDim = dimIds.find((d) => /time|month|tlist/i.test(d)) ?? dimIds[dimIds.length - 1];
  const timeIdx = cube.dimension[timeDim].category.index;
  const timeCodes = Array.isArray(timeIdx)
    ? timeIdx
    : Object.keys(timeIdx).sort((a, b) => timeIdx[a] - timeIdx[b]);

  // Fix every non-time dimension to the "All Items" / first category.
  const fixed = {};
  for (const d of dimIds) {
    if (d === timeDim) continue;
    const cat = cube.dimension[d].category;
    const labels = cat.label ?? {};
    const idx = cat.index;
    const codes = Array.isArray(idx) ? idx : Object.keys(idx).sort((a, b) => idx[a] - idx[b]);
    const allItems = codes.find((c) => /all items/i.test(labels[c] ?? ""));
    const chosen = allItems ?? codes[0];
    fixed[d] = Array.isArray(idx) ? idx.indexOf(chosen) : idx[chosen];
    if (!allItems && codes.length > 1) {
      console.warn(
        `  ! dimension "${d}" has no "All Items" category; defaulting to "${labels[codes[0]] ?? codes[0]}"`,
      );
    }
  }

  // Row-major strides.
  const strides = sizes.map((_, i) => sizes.slice(i + 1).reduce((a, b) => a * b, 1));
  const values = {};

  timeCodes.forEach((code, t) => {
    let offset = 0;
    dimIds.forEach((d, i) => {
      offset += (d === timeDim ? t : fixed[d]) * strides[i];
    });
    const v = cube.value[offset];
    const month = normaliseMonth(code);
    if (month && typeof v === "number" && Number.isFinite(v)) values[month] = v;
  });

  return values;
}

async function main() {
  console.log("Fetching CPI series CPM24 from the CSO…");

  const res = await fetch(API, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`CSO API returned ${res.status} ${res.statusText}`);

  const payload = await res.json();
  const cube = payload.dataset ?? payload;
  const values = extractAllItems(cube);

  const months = Object.keys(values).sort();
  if (months.length === 0) throw new Error("Parsed zero index values — the API shape may have changed");

  const existing = JSON.parse(await readFile(TARGET, "utf8"));
  const next = {
    ...existing,
    fetchedAt: new Date().toISOString(),
    note: existing.note,
    values: Object.fromEntries(months.map((m) => [m, values[m]])),
  };

  await writeFile(TARGET, JSON.stringify(next, null, 2) + "\n", "utf8");

  console.log(`Wrote ${months.length} monthly values to data/cpi-index.json`);
  console.log(`Range: ${months[0]} → ${months[months.length - 1]}`);
  console.log(`Latest: ${months[months.length - 1]} = ${values[months[months.length - 1]]}`);
  console.log(
    "\nNow verify: run the same dates through https://rtb.ie/rtb-rent-calculator/ and confirm the figures match.",
  );
}

main().catch((err) => {
  console.error("\nFailed to refresh CPI data:", err.message);
  console.error(
    "The app still works — it falls back to the 2% limb and to hand-entered index values.\n",
  );
  process.exit(1);
});
