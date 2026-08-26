/** Plan and usage — what this tenant is on, and how much of it is left.
 *
 *  Every number here is the server's own count from `GET /entitlements`; the
 *  panel does no arithmetic beyond turning used/limit into a bar width. That
 *  matters because the same figures decide a 402: if this screen and the
 *  server disagreed, the product would be telling the user one thing and
 *  refusing them on another.
 *
 *  Flow meters (invoices, Peppol documents) reset monthly and carry a
 *  `period`; stock meters (clients, products, companies, seats) are standing
 *  totals and carry null. The panel labels that difference rather than
 *  flattening it — "9 of 10 this month" and "9 of 10" are different promises.
 *
 *  Seats is shown even though nothing consumes it yet: there is no invite flow
 *  until B1 (email) lands, so every organisation has exactly one member. It is
 *  a real allowance the server reports, and hiding it would make the ceiling
 *  invisible the day invites ship.
 */

import {
  Badge,
  Button,
  Card,
  ErrorState,
  PageHeader,
  ProgressBar,
  Skeleton,
} from "@henrioutai/ui";

import { useEntitlements } from "../hooks/queries";
import { meterPercent, meterTone } from "../lib/entitlements";
import {
  t,
  tFeature,
  tMeter,
  tSubscriptionStatus,
  tTier,
  type Lang,
} from "../lib/translations";
import type { MeterUsageResponse } from "../types";
import { FeatureValue } from "./FeatureValue";

export interface UsagePanelProps {
  lang?: Lang;
  /** Navigate to the plan comparison. Omitted = the button is not rendered. */
  onSeePlans?: () => void;
}

export function UsagePanel({ lang = "en", onSeePlans }: UsagePanelProps) {
  const entitlements = useEntitlements();

  if (entitlements.isError) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          onRetry={() => void entitlements.refetch()}
          retryLabel={t(lang, "common.retry")}
        />
      </Card>
    );
  }

  if (entitlements.isLoading || !entitlements.data) {
    return (
      <div className="bg-stack">
        <Skeleton variant="block" height="5rem" />
        <Skeleton variant="block" height="14rem" />
      </div>
    );
  }

  const { tier, subscription_status, features, usage } = entitlements.data;
  const featureEntries = Object.entries(features);

  return (
    <div className="bg-stack">
      <PageHeader
        title={t(lang, "plan.title")}
        actions={
          onSeePlans ? (
            <Button variant="secondary" onClick={onSeePlans}>
              {t(lang, "plan.seePlans")}
            </Button>
          ) : undefined
        }
      />

      <Card title={t(lang, "plan.current")}>
        <div className="bg-plan__identity">
          <Badge tone="info">{tTier(lang, tier)}</Badge>
          <span className="bg-plan__status">
            {t(lang, "plan.status")}: {tSubscriptionStatus(lang, subscription_status)}
          </span>
        </div>
      </Card>

      <Card title={t(lang, "plan.usage")}>
        <div className="bg-plan__meters">
          {usage.map((entry) => (
            <MeterRow key={entry.meter} entry={entry} lang={lang} />
          ))}
        </div>
        <p className="bg-plan__caption">{t(lang, "plan.usageCaption")}</p>
      </Card>

      <Card title={t(lang, "plan.features")}>
        <ul className="bg-plan__features">
          {featureEntries.map(([key, value]) => (
            <li key={key} className="bg-plan__feature">
              <span className="bg-plan__featureName">{tFeature(lang, key)}</span>
              <FeatureValue value={value} lang={lang} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------- pieces

function MeterRow({ entry, lang }: { entry: MeterUsageResponse; lang: Lang }) {
  const percent = meterPercent(entry);
  const tone = meterTone(entry);
  const label = tMeter(lang, entry.meter);

  return (
    <div className={`bg-plan__meter bg-plan__meter--${tone}`}>
      <div className="bg-plan__meterHead">
        <span className="bg-plan__meterName">{label}</span>
        <span className="bg-plan__meterCount">
          <span className="bg-num">{entry.used}</span>
          {entry.limit === null ? (
            <>
              {" · "}
              <span>{t(lang, "plan.unlimited")}</span>
            </>
          ) : (
            <>
              {" / "}
              <span className="bg-num">{entry.limit}</span>
            </>
          )}
        </span>
      </div>

      {/* An unlimited allowance gets no bar: a track with nothing to fill it
          would read as 0% of something rather than as "no ceiling". */}
      {percent !== null ? <ProgressBar value={percent} label={label} /> : null}

      <div className="bg-plan__meterFoot">
        {entry.exhausted ? (
          <Badge tone="danger">{t(lang, "plan.exhausted")}</Badge>
        ) : entry.remaining !== null ? (
          <span>
            <span className="bg-num">{entry.remaining}</span> {t(lang, "plan.remaining")}
          </span>
        ) : null}
        {entry.period ? <span>{t(lang, "plan.thisPeriod")}</span> : null}
      </div>
    </div>
  );
}
