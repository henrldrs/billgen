/** One cell of the plan matrix.
 *
 *  A feature is either a flag or a grade, and the two must not look alike:
 *  "Included" and "Advanced" say different things about the same subscription.
 *  Shared by the usage panel (this tenant's plan) and the plan comparison
 *  (every plan) so a feature cannot read one way on one screen and another way
 *  on the other.
 */

import { Badge } from "@henrioutai/ui";

import { t, tLevel, type Lang } from "../lib/translations";

export interface FeatureValueProps {
  /** The raw wire value: `false`/`true`, or a grade like "advanced". */
  value: boolean | string | undefined;
  lang?: Lang;
}

export function FeatureValue({ value, lang = "en" }: FeatureValueProps) {
  if (typeof value === "string") return <Badge tone="info">{tLevel(lang, value)}</Badge>;
  // An absent key means "not included" — see the matrix docstring. Rendering it
  // as an em dash would leave the user guessing whether it is a gap in the
  // table or a gap in the plan.
  return value ? (
    <Badge tone="success">{t(lang, "plan.included")}</Badge>
  ) : (
    <Badge tone="neutral">{t(lang, "plan.notIncluded")}</Badge>
  );
}
