/** One listener, every commercial refusal.
 *
 *  Mount this once inside a shell and the whole app has an upgrade prompt.
 *  It subscribes to the React Query caches rather than wrapping calls, so no
 *  hook, panel or button has to opt in, and no component anywhere needs to
 *  know what a plan is — which is what the uniform 402 contract was for. A new
 *  gated endpoint on the server is covered the day it ships.
 *
 *  Only 402 lands here. A 403 is authenticated-but-not-authorised, which is a
 *  different conversation and must never be answered with a price; that
 *  distinction is enforced by `isEntitlementError`, not by this component.
 *
 *  The refusal also invalidates ["entitlements"], because a spent allowance is
 *  new information about usage: the meters on the billing screen should agree
 *  with the dialog the user just read.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { isEntitlementError, type EntitlementFailure } from "../lib/apiClient";
import { UpgradeDialog } from "../panels/UpgradeDialog";
import type { Lang } from "../lib/translations";

export interface EntitlementBoundaryProps {
  lang?: Lang;
  /** Navigate to the plan comparison. Shell-owned: the UI kit has no router. */
  onSeePlans?: () => void;
}

export function EntitlementBoundary({ lang = "en", onSeePlans }: EntitlementBoundaryProps) {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<EntitlementFailure | null>(null);

  useEffect(() => {
    const handle = (error: unknown) => {
      if (!isEntitlementError(error)) return;
      setFailure(error.entitlement);
      void queryClient.invalidateQueries({ queryKey: ["entitlements"] });
    };

    // Mutations are the common case (creating the 51st invoice); queries cover
    // the gated reads (a report the tier does not include).
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        handle(event.action.error);
      }
    });
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        handle(event.action.error);
      }
    });

    return () => {
      unsubscribeMutations();
      unsubscribeQueries();
    };
  }, [queryClient]);

  return (
    <UpgradeDialog
      failure={failure}
      lang={lang}
      onClose={() => setFailure(null)}
      onSeePlans={onSeePlans}
    />
  );
}
