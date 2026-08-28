/** Pick the tier the dev profile is on.
 *
 *  Checkout is the deliberately-deferred half of B4, so there is no way to
 *  change a plan through the product. That makes the entire entitlement layer —
 *  every 402, every meter, every upgrade prompt, the template designer's gate —
 *  unreachable in dev without editing a database row by hand. This is that row,
 *  with a button on it.
 *
 *  Two independent guards, because one is not enough for something that grants
 *  a plan:
 *
 *  * `import.meta.env.DEV` — absent from a production bundle entirely, so this
 *    file's code never ships;
 *  * the endpoint 404s unless the API was started with `desktop_mode`, so even
 *    a dev bundle pointed at a hosted API can do nothing with it.
 *
 *  The second is the one that matters. The first is only tidiness — a bundler
 *  flag is not a security boundary, and treating it as one is how a debug
 *  endpoint ends up in production.
 */

import { useState } from "react";
import { Badge, Button, Card } from "@henrioutai/ui";
import { useApi, useEntitlements } from "@billgen/ui";
import { useQueryClient } from "@tanstack/react-query";

const TIERS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "business", label: "Business" },
  { value: "business_pro", label: "Business Pro" },
] as const;

export function DevTierSwitch() {
  const api = useApi();
  const queryClient = useQueryClient();
  const entitlements = useEntitlements();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!import.meta.env.DEV) return null;

  const current = entitlements.data?.tier;

  async function choose(tier: string) {
    setBusy(tier);
    setError(null);
    try {
      await api.setDesktopPlanTier(tier);
      //  Everything downstream of a tier is cached: the feature map, the
      //  meters, and every screen that badges itself from them. Clearing the
      //  lot is right here — a targeted invalidation would have to know which
      //  queries read entitlements, and that list grows.
      await queryClient.invalidateQueries();
    } catch (cause) {
      //  A 404 here means the API is not in desktop mode, which is the expected
      //  answer against a hosted one — say so rather than showing a raw error.
      setError(
        cause instanceof Error && cause.message.includes("404")
          ? "This API was not started with desktop_mode, so the switch is not available."
          : "Could not change the tier.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <div className="bg-dev-tier">
        <div className="bg-dev-tier__head">
          <Badge tone="warn">dev only</Badge>
          <div>
            <strong>Simulate a plan</strong>
            <p>
              There is no checkout yet. This writes the organization's tier
              directly so the entitlement layer can be exercised. Absent from
              production builds, and refused by any API not in desktop mode.
            </p>
          </div>
        </div>

        <div className="bg-dev-tier__options" role="group" aria-label="Plan tier">
          {TIERS.map((tier) => (
            <Button
              key={tier.value}
              variant={tier.value === current ? "primary" : "secondary"}
              disabled={busy !== null}
              onClick={() => choose(tier.value)}
            >
              {busy === tier.value ? "…" : tier.label}
            </Button>
          ))}
        </div>

        {error && <p className="bg-dev-tier__error">{error}</p>}
      </div>
    </Card>
  );
}
