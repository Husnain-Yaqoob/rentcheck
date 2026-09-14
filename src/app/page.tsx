import { Checker } from "@/components/Checker";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Ireland · rules in force from 1 March 2026
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Is your rent increase legal?
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--text-muted)]">
          The RTB publishes a calculator that does the arithmetic. This does the other half — whether
          the notice you were handed is valid at all, whether an exemption stands up, and whether
          your landlord was even entitled to reset the rent.
        </p>
      </header>

      <Checker />

      <section className="mt-12 grid gap-6 border-t border-[var(--line)] pt-8 sm:grid-cols-3">
        <div>
          <h2 className="text-sm font-semibold">What changed in March 2026</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
            Rent Pressure Zones were scrapped and replaced with one national rent control. Where your
            property is no longer matters. Rent increases within a tenancy are capped at inflation
            (CPI) or 2%, whichever is lower.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">The cap is a ceiling, not a right</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
            Rent can never exceed market rent for comparable properties, whatever the percentage
            allows — and that holds even where an exemption applies.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">An invalid notice raises nothing</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
            A defective notice cannot increase your rent, and there is no time limit on challenging
            one. Missing the usual 28-day window is not the end of the road.
          </p>
        </div>
      </section>

      <footer className="mt-10 border-t border-[var(--line)] pt-6 text-xs leading-relaxed text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">This is not legal advice.</p>
        <p className="mt-1.5 max-w-3xl">
          It is an open-source reading of published rules, and it can be wrong — rules change, and
          your circumstances may not fit the assumptions here. Before acting, check the figures on
          the{" "}
          <a
            className="underline underline-offset-2"
            href="https://rtb.ie/rtb-rent-calculator/"
            target="_blank"
            rel="noreferrer"
          >
            RTB Rent Calculator
          </a>{" "}
          and the rules at{" "}
          <a
            className="underline underline-offset-2"
            href="https://www.citizensinformation.ie/en/housing/renting-a-home/landlords-rights-and-responsibilities/rent-increases-in-private-rented-housing/"
            target="_blank"
            rel="noreferrer"
          >
            Citizens Information
          </a>
          . Free advice is available from{" "}
          <a
            className="underline underline-offset-2"
            href="https://threshold.ie/"
            target="_blank"
            rel="noreferrer"
          >
            Threshold
          </a>
          .
        </p>
        <p className="mt-3">Nothing you type here leaves your device. There is no account and no tracking.</p>
      </footer>
    </div>
  );
}
