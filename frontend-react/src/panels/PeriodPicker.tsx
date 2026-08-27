/** The declaration-period picker: month, quarter or year.
 *
 *  Extracted from VatReportPanel when the invoices report needed exactly the
 *  same control. It is not a generic date range on purpose — `?period` takes
 *  "2026", "2026-Q3" or "2026-07" and nothing else, because those are the
 *  Belgian declaration rhythms, and a picker that could express "12 March to
 *  4 August" would be offering a request the endpoint cannot answer.
 *
 *  The translation keys stay `vat.*`. They read as generic ("Month", "Quarter",
 *  "Period") and renaming them would touch four languages to say the same
 *  words in a different key.
 */

import { useMemo, useState, type ReactNode } from "react";

import { Field, Segmented, Select } from "@henrioutai/ui";

import { monthName } from "../lib/format";
import { t, type Lang } from "../lib/translations";

export type Granularity = "month" | "quarter" | "year";

export function currentQuarter(date = new Date()): string {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

/** Split "2026-Q3" / "2026-07" / "2026" back into the picker's three controls,
 *  so a seeded period lands the UI on the period it actually requested. */
export function splitPeriod(period: string): {
  granularity: Granularity;
  year: number;
  part: string;
} {
  const [year, rest] = period.split("-");
  if (rest === undefined) return { granularity: "year", year: Number(year), part: "" };
  if (rest.startsWith("Q")) return { granularity: "quarter", year: Number(year), part: rest };
  return { granularity: "month", year: Number(year), part: rest };
}

export interface PeriodPickerOptions {
  lang: Lang;
  /** Where the picker starts. Defaults to the current quarter. */
  seed?: string;
  yearsBack?: number;
}

/** Returns the period string to query with, and the controls that change it. */
export function usePeriodPicker({
  lang,
  seed: seedPeriod,
  yearsBack = 4,
}: PeriodPickerOptions): { period: string; controls: ReactNode } {
  const seed = splitPeriod(seedPeriod ?? currentQuarter());
  const [granularity, setGranularity] = useState<Granularity>(seed.granularity);
  const [year, setYear] = useState(seed.year);
  const [part, setPart] = useState(seed.part);

  // The part list changes with the granularity, so switching Month → Quarter
  // has to re-seed it or the request would carry "2026-07" as a quarter.
  const parts = useMemo(() => {
    if (granularity === "quarter") {
      return ["Q1", "Q2", "Q3", "Q4"].map((q) => ({ value: q, label: q }));
    }
    if (granularity === "month") {
      return Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1).padStart(2, "0"),
        label: monthName(index + 1, lang),
      }));
    }
    return [];
  }, [granularity, lang]);

  const activePart =
    granularity === "year" ? "" : parts.some((p) => p.value === part) ? part : parts[0].value;
  const period = granularity === "year" ? String(year) : `${year}-${activePart}`;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: yearsBack + 1 }, (_, index) => thisYear - index);

  const controls = (
    <div className="bg-report__controls">
      <Field label={t(lang, "vat.granularity")}>
        <Segmented
          ariaLabel={t(lang, "vat.granularity")}
          value={granularity}
          onChange={(value) => {
            setGranularity(value);
            setPart("");
          }}
          options={[
            { value: "month", label: t(lang, "vat.month") },
            { value: "quarter", label: t(lang, "vat.quarter") },
            { value: "year", label: t(lang, "vat.year") },
          ]}
        />
      </Field>
      <Field label={t(lang, "reports.year")}>
        <Select
          value={String(year)}
          options={years.map((value) => ({ value: String(value), label: String(value) }))}
          onChange={(event) => setYear(Number(event.target.value))}
        />
      </Field>
      {granularity === "year" ? null : (
        <Field label={t(lang, "vat.period")}>
          <Select
            value={activePart}
            options={parts}
            onChange={(event) => setPart(event.target.value)}
          />
        </Field>
      )}
    </div>
  );

  return { period, controls };
}
