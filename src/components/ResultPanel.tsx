"use client";

import { useState } from "react";
import { formatIrishDate } from "@/lib/dates";
import { buildLetter } from "@/lib/letter";
import { euro } from "@/lib/format";
import type { Check, TenancyInput, Verdict } from "@/lib/types";

const OUTCOME_STYLE: Record<Verdict["outcome"], { ring: string; chip: string; label: string }> = {
  "likely-unlawful": {
    ring: "border-[var(--color-clay-500)]",
    chip: "bg-[var(--color-clay-100)] text-[var(--color-clay-700)]",
    label: "Problem found",
  },
  "likely-lawful": {
    ring: "border-[var(--color-moss-500)]",
    chip: "bg-[var(--color-moss-100)] text-[var(--color-moss-700)]",
    label: "Looks within the rules",
  },
  "cannot-determine": {
    ring: "border-[var(--color-ink-300)]",
    chip: "bg-[var(--color-amber-ochre-100)] text-[var(--color-amber-ochre-600)]",
    label: "Needs more detail",
  },
};

const STATUS_MARK: Record<Check["status"], { mark: string; className: string }> = {
  pass: { mark: "✓", className: "text-[var(--color-moss-600)]" },
  fail: { mark: "✕", className: "text-[var(--color-clay-600)]" },
  warn: { mark: "!", className: "text-[var(--color-amber-ochre-600)]" },
  unknown: { mark: "?", className: "text-[var(--text-muted)]" },
};

export function ResultPanel({ input, verdict }: { input: TenancyInput; verdict: Verdict }) {
  const [showLetter, setShowLetter] = useState(false);
  const [copied, setCopied] = useState(false);
  const style = OUTCOME_STYLE[verdict.outcome];
  const { cap } = verdict;

  const letter = buildLetter(input, verdict);

  async function copyLetter() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`card border-t-4 ${style.ring} overflow-hidden`}>
      <div className="p-5 sm:p-6">
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${style.chip}`}
        >
          {style.label}
        </span>

        <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-balance">
          {verdict.headline}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{verdict.summary}</p>

        {verdict.overchargePerMonth !== null && verdict.overchargePerMonth > 0.5 ? (
          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)]">
            <div className="bg-[var(--surface)] p-3">
              <dt className="text-xs text-[var(--text-muted)]">Maximum lawful rent</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {euro(cap.maxLegalRent)}
              </dd>
            </div>
            <div className="bg-[var(--surface)] p-3">
              <dt className="text-xs text-[var(--text-muted)]">Over the cap by</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--color-clay-600)]">
                {euro(verdict.overchargePerMonth)}
                <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">/month</span>
              </dd>
            </div>
          </dl>
        ) : null}
      </div>

      {/* The arithmetic, shown rather than asserted. */}
      <div className="border-t border-[var(--line)] p-5 sm:p-6">
        <h3 className="text-sm font-semibold">How that was worked out</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Section 19 sets two ceilings. The lower one governs.
        </p>

        <div className="mt-3 space-y-2">
          <LimbRow
            title="2% per year, apportioned"
            active={cap.binding === "percent"}
            amount={cap.percentLimb.maxRent}
            detail={cap.percentLimb.explanation}
            applies={cap.percentLimb.applies}
          />
          <LimbRow
            title="Consumer Price Index"
            active={cap.binding === "cpi"}
            amount={cap.cpiLimb.maxRent}
            detail={cap.cpiLimb.explanation}
            applies={cap.cpiLimb.applies}
          />
        </div>

        {cap.notes.length > 0 ? (
          <ul className="mt-4 space-y-1.5">
            {cap.notes.map((n, i) => (
              <li key={i} className="text-xs leading-relaxed text-[var(--text-muted)]">
                {n}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Notice validity — the part the RTB's own calculator does not do. */}
      <div className="border-t border-[var(--line)] p-5 sm:p-6">
        <h3 className="text-sm font-semibold">The notice itself</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          An invalid notice cannot raise your rent, whatever the arithmetic says.
        </p>

        <ul className="mt-3 space-y-3">
          {verdict.checks.map((c) => {
            const mark = STATUS_MARK[c.status];
            return (
              <li key={c.id} className="flex gap-2.5">
                <span
                  aria-hidden
                  className={`mt-px w-4 shrink-0 text-center text-sm font-bold ${mark.className}`}
                >
                  {mark.mark}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {c.label}
                    {c.fatal && c.status === "fail" ? (
                      <span className="ml-1.5 rounded bg-[var(--color-clay-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-clay-700)]">
                        invalidating
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
                    {c.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Deadline */}
      <div className="border-t border-[var(--line)] p-5 sm:p-6">
        <h3 className="text-sm font-semibold">If you want to challenge it</h3>
        <p className="mt-1.5 text-sm leading-relaxed">
          {verdict.disputeDeadline.date ? (
            <>
              Refer the dispute to the RTB by{" "}
              <strong className="font-semibold">
                {formatIrishDate(verdict.disputeDeadline.date)}
              </strong>
              .
            </>
          ) : (
            <strong className="font-semibold">There is no deadline in your case.</strong>
          )}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
          {verdict.disputeDeadline.basis}
        </p>
        <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
          Keep paying your existing rent while a dispute is open. Withholding rent creates a
          separate problem that can be used against you.
        </p>

        <div className="no-print mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowLetter((s) => !s)}
            className="rounded-lg bg-[var(--color-ink-900)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-ink-800)] dark:bg-[var(--color-ink-100)] dark:text-[var(--color-ink-900)] dark:hover:bg-white"
          >
            {showLetter ? "Hide the letter" : "Draft a letter to my landlord"}
          </button>
          <a
            href="https://rtb.ie/disputes/disputes-process/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--line)] px-3.5 py-2 text-sm font-medium transition hover:bg-[var(--page)]"
          >
            RTB dispute process ↗
          </a>
        </div>

        {showLetter ? (
          <div className="mt-4">
            <div className="no-print mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--text-muted)]">
                Read it before you send it, and fill in the bracketed parts.
              </p>
              <button
                type="button"
                onClick={copyLetter}
                className="shrink-0 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--page)]"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--page)] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {letter}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LimbRow({
  title,
  amount,
  detail,
  active,
  applies,
}: {
  title: string;
  amount: number | null;
  detail: string;
  active: boolean;
  applies: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 transition ${
        active
          ? "border-[var(--color-ink-400)] bg-[var(--page)]"
          : "border-[var(--line)] opacity-70"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          {title}
          {active ? (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              binding
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {applies ? euro(amount) : "n/a"}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}
