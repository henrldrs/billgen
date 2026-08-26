/** The one screen every commercial refusal lands on.
 *
 *  The 402 contract exists so that no React component ever contains payment
 *  logic: the server answers one uniform body — `error`, `required_tier`,
 *  `feature`, `message`, and for a spent allowance `used`/`limit`/`period` —
 *  and this dialog renders it. A new gated endpoint on the server needs no
 *  frontend change at all, which is the whole point; if a feature ever needs
 *  its own bespoke upsell, that is a signal the contract is being bent.
 *
 *  Two failures share the shape and read very differently to a user:
 *
 *    entitlement_required   the plan lacks the capability outright
 *    usage_limit_reached    the plan has it and this month's allowance is spent
 *
 *  The server's `message` is English-only, so it is rendered as supporting
 *  detail under a translated headline rather than as the headline itself.
 */

import { Badge, Button, Modal, ProgressBar } from "@henrioutai/ui";

import type { EntitlementFailure } from "../lib/apiClient";
import { t, tFeature, tMeter, tTier, type Lang } from "../lib/translations";

export interface UpgradeDialogProps {
  /** The 402 body, or null when nothing has been refused. */
  failure: EntitlementFailure | null;
  lang?: Lang;
  onClose: () => void;
  /** Navigates to the plan comparison. Omitted = the dialog only explains. */
  onSeePlans?: () => void;
}

export function UpgradeDialog({
  failure,
  lang = "en",
  onClose,
  onSeePlans,
}: UpgradeDialogProps) {
  if (!failure) return null;

  const spent = failure.error === "usage_limit_reached";
  // A spent allowance names a METER ("invoices"); a missing capability names a
  // FEATURE ("pdf_remove_branding"). Same field, two vocabularies.
  const subject = spent ? tMeter(lang, failure.feature) : tFeature(lang, failure.feature);
  const percent =
    failure.limit && failure.limit > 0 && failure.used !== undefined
      ? Math.min(100, Math.round((failure.used / failure.limit) * 100))
      : null;

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t(lang, spent ? "plan.limitTitle" : "plan.upgradeTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t(lang, "common.close")}
          </Button>
          {onSeePlans ? (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onSeePlans();
              }}
            >
              {t(lang, "plan.seePlans")}
            </Button>
          ) : null}
        </>
      }
    >
      <p className="bg-upgrade__subject">{subject}</p>

      {spent && percent !== null ? (
        <div className="bg-upgrade__meter">
          <ProgressBar value={percent} label={subject} />
          <p className="bg-upgrade__counts">
            <span className="bg-num">{failure.used}</span>
            {" / "}
            <span className="bg-num">{failure.limit}</span>
            {failure.period ? ` · ${failure.period}` : null}
          </p>
        </div>
      ) : null}

      {/* Server-authored and English-only. It is the most specific thing we
          can say, so it stays — as detail, never as the headline. */}
      <p className="bg-upgrade__message">{failure.message}</p>

      <p className="bg-upgrade__tier">
        {failure.required_tier ? (
          <>
            {t(lang, "plan.requiredTier")}{" "}
            <Badge tone="info">{tTier(lang, failure.required_tier)}</Badge>
          </>
        ) : (
          t(lang, "plan.noUpgrade")
        )}
      </p>
    </Modal>
  );
}
