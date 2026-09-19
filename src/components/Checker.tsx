"use client";

import { useMemo, useState } from "react";
import { DateInput, Field, MoneyInput, Section, Segmented, Select, TriToggle } from "./fields";
import { ResultPanel } from "./ResultPanel";
import { assess } from "@/lib/verdict";
import { cpiMeta, cpiCoverage, isCpiLoaded } from "@/lib/cpi";
import type {
  ExemptionClaim,
  LandlordSize,
  PreviousTenancyEnding,
  PropertyClass,
  TenancyInput,
} from "@/lib/types";

const cpiLoaded = isCpiLoaded();
const coverage = cpiCoverage();

const DEFAULTS: TenancyInput = {
  currentRent: 1500,
  proposedRent: 1650,
  dateRentLastSet: "2025-06-01",
  dateNewRentEffective: "2026-10-01",
  tenancyStart: "2023-04-01",
  propertyClass: "standard",
  exemptionClaimed: "none",
  landlordSize: "unknown",
  previousTenancyEnding: "notApplicable",
  noticeReceived: "2026-06-15",
  noticeHasThreeComparables: null,
  noticeHasRtbCalculation: null,
  noticeStatesRule: null,
  noticeServedOnRtb: null,
  manualCpi: null,
};

export function Checker() {
  const [input, setInput] = useState<TenancyInput>(DEFAULTS);
  const [manualPrev, setManualPrev] = useState<number | null>(null);
  const [manualCurr, setManualCurr] = useState<number | null>(null);

  const set = <K extends keyof TenancyInput>(key: K, value: TenancyInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const effectiveInput: TenancyInput = useMemo(
    () => ({
      ...input,
      manualCpi:
        manualPrev !== null && manualCurr !== null && manualPrev > 0
          ? { previous: manualPrev, current: manualCurr }
          : null,
    }),
    [input, manualPrev, manualCurr],
  );

  const verdict = useMemo(() => {
    try {
      return assess(effectiveInput);
    } catch {
      return null;
    }
  }, [effectiveInput]);

  const isRelet = input.previousTenancyEnding !== "notApplicable";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
        <Section step={1} title="Your tenancy">
          <Field
            label="When did this tenancy start?"
            hint="Tenancies that began before 1 March 2026 keep the older termination rules — and can never have rent reset to market rent every six years."
          >
            <DateInput value={input.tenancyStart} onChange={(v) => set("tenancyStart", v)} />
          </Field>

          <Field label="What rent do you pay now, per month?">
            <MoneyInput
              value={input.currentRent}
              onChange={(v) => set("currentRent", v ?? 0)}
            />
          </Field>

          <Field
            label="When was that rent last set?"
            hint="The date the current rent was agreed or last increased — not the date of this notice."
          >
            <DateInput
              value={input.dateRentLastSet}
              onChange={(v) => set("dateRentLastSet", v)}
            />
          </Field>

          <Field
            label="Who is the landlord?"
            hint="A registered company counts as a larger landlord even with a single property."
          >
            <Select<LandlordSize>
              value={input.landlordSize}
              onChange={(v) => set("landlordSize", v)}
              options={[
                { value: "unknown", label: "Not sure" },
                { value: "smaller", label: "An individual with 3 or fewer tenancies" },
                { value: "larger", label: "A company, or 4 or more tenancies" },
              ]}
            />
          </Field>
        </Section>

        <Section step={2} title="The increase being proposed">
          <Field label="What rent are they asking for?">
            <MoneyInput value={input.proposedRent} onChange={(v) => set("proposedRent", v)} />
          </Field>

          <Field label="When would the new rent start?">
            <DateInput
              value={input.dateNewRentEffective}
              onChange={(v) => set("dateNewRentEffective", v)}
            />
          </Field>

          <Field
            label="What kind of property is it?"
            hint="New apartments and student accommodation with a commencement notice from 10 June 2025 are capped by inflation alone, with no 2% ceiling."
          >
            <Segmented<PropertyClass>
              value={input.propertyClass}
              onChange={(v) => set("propertyClass", v)}
              options={[
                { value: "standard", label: "Standard" },
                { value: "newApartmentOrSSA", label: "New apartment / student" },
              ]}
            />
          </Field>

          <Field
            label="Is the landlord claiming an exemption?"
            hint="Exemptions are narrow. A new kitchen or a repaint is not a substantial change."
          >
            <Select<ExemptionClaim>
              value={input.exemptionClaimed}
              onChange={(v) => set("exemptionClaimed", v)}
              options={[
                { value: "none", label: "No exemption claimed" },
                { value: "substantialChange", label: "Substantial change / renovation" },
                { value: "protectedStructure", label: "Protected structure" },
                { value: "notLetTwoYears", label: "Not let in the last 2 years" },
                { value: "other", label: "Something else" },
              ]}
            />
          </Field>
        </Section>

        <Section
          step={3}
          title="The notice you received"
          description="Leave anything you are unsure about as 'not sure' — the result will say so rather than guess."
        >
          <Field label="When did the notice arrive?">
            <DateInput
              value={input.noticeReceived ?? ""}
              onChange={(v) => set("noticeReceived", v || null)}
            />
          </Field>

          <Field
            label="Does it list three comparable properties?"
            hint="Part C of the prescribed form requires three, each with a registered tenancy number."
          >
            <TriToggle
              value={input.noticeHasThreeComparables ?? null}
              onChange={(v) => set("noticeHasThreeComparables", v)}
            />
          </Field>

          <Field label="Does it enclose an RTB rent calculation?">
            <TriToggle
              value={input.noticeHasRtbCalculation ?? null}
              onChange={(v) => set("noticeHasRtbCalculation", v)}
            />
          </Field>

          <Field label="Does it say which rent rule it relies on?">
            <TriToggle
              value={input.noticeStatesRule ?? null}
              onChange={(v) => set("noticeStatesRule", v)}
            />
          </Field>

          <Field
            label="Was a copy sent to the RTB?"
            hint="Since 14 September 2026 the landlord has 7 days to send it. Before that it had to go the same day."
          >
            <TriToggle
              value={input.noticeServedOnRtb ?? null}
              onChange={(v) => set("noticeServedOnRtb", v)}
            />
          </Field>

          <Field
            label="Are you a new tenant in a property someone else just left?"
            hint="This matters a great deal: a landlord may not reset the rent to market rate after a no-fault eviction."
          >
            <Select<PreviousTenancyEnding>
              value={input.previousTenancyEnding}
              onChange={(v) => set("previousTenancyEnding", v)}
              options={[
                { value: "notApplicable", label: "No — I'm the continuing tenant" },
                { value: "tenantLeftVoluntarily", label: "Yes — they left by choice" },
                { value: "tenantBreached", label: "Yes — they were evicted for breach" },
                { value: "landlordSale", label: "Yes — landlord said they were selling" },
                {
                  value: "landlordOrFamilyOccupation",
                  label: "Yes — landlord or family moving in",
                },
                { value: "refurbishment", label: "Yes — for refurbishment" },
                { value: "changeOfUse", label: "Yes — change of use" },
                { value: "unknown", label: "Yes — I don't know why they left" },
              ]}
            />
          </Field>
        </Section>

        {!cpiLoaded ? (
          <Section
            step={4}
            title="Inflation figures"
            description="The CPI table hasn't been loaded into this copy of the app, so the inflation limb can't be applied automatically."
          >
            <Field
              label="CPI when rent was last set"
              hint="From the RTB Rent Calculator, or CSO series CPM24."
            >
              <MoneyInput value={manualPrev} onChange={setManualPrev} />
            </Field>
            <Field label="CPI now">
              <MoneyInput value={manualCurr} onChange={setManualCurr} />
            </Field>
            <p className="field-hint sm:col-span-2">
              Run <code className="font-mono">npm run fetch:cpi</code> to pull the full series from
              the CSO and this section disappears.
            </p>
          </Section>
        ) : null}

        <p className="px-1 text-xs leading-relaxed text-[var(--text-muted)]">
          {cpiLoaded && coverage ? (
            <>
              CPI data: {cpiMeta.label} ({cpiMeta.base}), covering {coverage.first} to{" "}
              {coverage.last}
              {cpiMeta.fetchedAt
                ? `, fetched ${new Date(cpiMeta.fetchedAt).toLocaleDateString("en-IE")}`
                : ""}
              .
            </>
          ) : (
            <>CPI data not loaded — results use the 2% limb only unless you enter figures above.</>
          )}
        </p>
      </form>

      <div className="lg:sticky lg:top-6">
        {verdict ? (
          <ResultPanel input={effectiveInput} verdict={verdict} />
        ) : (
          <div className="card p-6 text-sm text-[var(--text-muted)]">
            Fill in the dates above to see a result.
          </div>
        )}
      </div>
    </div>
  );
}
