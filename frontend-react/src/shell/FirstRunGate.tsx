/** Sends an organization that has never finished the first run to the wizard.
 *
 *  The fact it reads is the server's (`GET /onboarding` → `completed_at`),
 *  never a browser flag: a reinstall, a second machine or a cleared cache
 *  all see the same answer. It fails **open** — a network error or a server
 *  that cannot answer shows the app rather than a locked door, because an
 *  invoicing program that will not open on a bad morning is the worse bug.
 *
 *  Lives in the shells, not in ProductShell: the shell tests render
 *  ProductShell without a session and must not need an onboarding mock.
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingScreen } from "@henrioutai/ui";

import { useOnboardingStatus } from "../hooks/queries";

export interface FirstRunGateProps {
  children: ReactNode;
  wizardPath?: string;
}

export function FirstRunGate({ children, wizardPath = "/app/onboarding/wizard" }: FirstRunGateProps) {
  const status = useOnboardingStatus();
  const location = useLocation();

  if (status.isLoading) return <LoadingScreen />;
  const notDone = status.isSuccess && status.data.completed_at === null;
  const onWizard = location.pathname.startsWith(wizardPath);
  if (notDone && !onWizard) return <Navigate to={wizardPath} replace />;
  return <>{children}</>;
}
