"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint block">{hint}</span> : null}
    </label>
  );
}

export function MoneyInput({
  value,
  onChange,
  id,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  id?: string;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]"
      >
        €
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        className="input input-money"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

export function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-active={value === o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Yes / No / Not sure — "not sure" is a first-class answer, not a failure. */
export function TriToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const options: { value: boolean | null; label: string }[] = [
    { value: true, label: "Yes" },
    { value: false, label: "No" },
    { value: null, label: "Not sure" },
  ];
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          data-active={value === o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink-900)] text-xs font-semibold text-white dark:bg-[var(--color-ink-100)] dark:text-[var(--color-ink-900)]">
          {step}
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
