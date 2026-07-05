/** Display-only formatting for the UI. The legally binding formatting on
 *  PDFs/XML happens server-side in core — these two must not be confused. */

import type { Lang } from "./translations";

const LOCALE: Record<Lang, string> = {
  en: "en",
  fr: "fr-BE",
  nl: "nl-BE",
  es: "es",
};

export function formatMoney(
  value: string | number,
  currency = "EUR",
  lang: Lang = "en",
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat(LOCALE[lang], {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(isoDate: string, lang: Lang = "en"): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: "medium" }).format(parsed);
}

export function monthName(month: number, lang: Lang = "en"): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { month: "long" }).format(
    new Date(2026, month - 1, 1),
  );
}
