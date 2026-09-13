/** The guided tour's six stops, from the onboarding spec's step 5 ("Guided
 *  In-App Tour"). The spec names three hotspots — the usage meter, the invoice
 *  builder, the settings hub — and this walks to each through the control
 *  that reaches it, plus the three controls a first-time user otherwise
 *  discovers by accident: the section popups, the palette, the switchers.
 *
 *  Anchors are CSS selectors over the shared shell. They live here, in one
 *  place, so a renamed class breaks one file and one test rather than a tour
 *  step nobody notices is pointing at nothing. `tourAnchors.test.tsx` renders
 *  the shell and asserts every selector matches. */

import type { GuidedTourLabels, TourStep } from "@henrioutai/ui";

import { t, tf, type Lang } from "../lib/translations";

export const TOUR_ANCHORS = {
  sections: ".bg-topnav__links",
  create: ".bg-create-bill",
  search: ".bg-topnav__actions [aria-label='Search']",
  company: ".bg-org",
  numbers: ".bg-kpi-grid",
  account: ".bg-account-menu__trigger",
} as const;

export type TourStopKey = keyof typeof TOUR_ANCHORS;

const ORDER: TourStopKey[] = ["sections", "create", "search", "company", "numbers", "account"];

export function tourSteps(lang: Lang): TourStep[] {
  return ORDER.map((key) => ({
    key,
    anchor: TOUR_ANCHORS[key],
    title: t(lang, `tour.${key}.title` as const),
    body: t(lang, `tour.${key}.body` as const),
    placement: "bottom",
  }));
}

export function tourLabels(lang: Lang): GuidedTourLabels {
  return {
    dialog: t(lang, "tour.dialog"),
    next: t(lang, "tour.next"),
    back: t(lang, "tour.back"),
    skip: t(lang, "tour.skip"),
    finish: t(lang, "tour.finish"),
    stepOf: (index, count) => tf(lang, "tour.stepOf", { index, count }),
  };
}
