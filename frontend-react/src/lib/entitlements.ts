/** Reading the entitlement payload — presentation helpers only.
 *
 *  Nothing here decides anything. `GET /entitlements` says what this tenant's
 *  plan includes so screens can badge, grade and meter themselves honestly; the
 *  server re-checks every gated call and answers 402 regardless of what the UI
 *  rendered. A hidden button is UX, a refused request is the rule — so these
 *  helpers may be wrong (a stale cache, a tier changed in another tab) without
 *  anything being given away.
 *
 *  Two shapes come off the wire and both are open vocabularies:
 *
 *    features  { [key]: boolean | string }   graded values are "basic" | "full"
 *                                            | "advanced" | "consolidated" | …
 *    usage     MeterUsageResponse[]          limit: null means unlimited
 */

import type { EntitlementsResponse, MeterUsageResponse } from "../types";

/** Feature map as it arrives — a bare boolean flag or a graded string. */
export type FeatureMap = EntitlementsResponse["features"];

/** The raw value of one feature, or undefined when the tier omits the key.
 *  A missing key means "not included", exactly as the matrix documents. */
export function featureValue(
  features: FeatureMap | undefined,
  key: string,
): boolean | string | undefined {
  return features?.[key];
}

/** True when the plan includes the feature at all.
 *
 *  Graded features are truthy at every grade — `vat_report: "basic"` IS a VAT
 *  report — so a screen asking "may I show this?" gets a yes and then reads
 *  `featureValue` to pick its variant. The only falsy values are `false` and
 *  an absent key. An empty string would also be falsy, which is fine: the
 *  matrix never uses one, and a blank grade is not a grade. */
export function hasFeature(features: FeatureMap | undefined, key: string): boolean {
  return Boolean(features?.[key]);
}

/** The grade of a graded feature, or undefined when it is a plain flag. */
export function featureGrade(
  features: FeatureMap | undefined,
  key: string,
): string | undefined {
  const value = features?.[key];
  return typeof value === "string" ? value : undefined;
}

/** One meter out of the usage array, by wire name. */
export function meterUsage(
  usage: MeterUsageResponse[] | undefined,
  meter: string,
): MeterUsageResponse | undefined {
  return usage?.find((entry) => entry.meter === meter);
}

/** How full the allowance is, 0–100, or null when it is unlimited.
 *
 *  Clamped at 100 on purpose: a limit can be lowered below what a tenant
 *  already holds (a downgrade keeps every record — see the entitlement
 *  service), and a 340%-full bar is a rendering bug, not information. */
export function meterPercent(entry: MeterUsageResponse | undefined): number | null {
  if (!entry || entry.limit === null || entry.limit <= 0) return null;
  return Math.min(100, Math.round((entry.used / entry.limit) * 100));
}

/** Bar tone for an allowance: spent, nearly spent, or fine. */
export function meterTone(
  entry: MeterUsageResponse | undefined,
): "neutral" | "warn" | "danger" {
  if (!entry) return "neutral";
  if (entry.exhausted) return "danger";
  const percent = meterPercent(entry);
  return percent !== null && percent >= 80 ? "warn" : "neutral";
}
