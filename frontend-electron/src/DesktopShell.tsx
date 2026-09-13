/** The desktop's half of the `PlatformAdapter`, and nothing else.
 *
 *  This file used to be a second shell: a tab state machine over eleven panels,
 *  no router, no IA — 284 lines that lagged `frontend-saas` the moment either
 *  changed, and that silently lacked the template studio and every report
 *  screen the web app had. T-19 deleted it in favour of `ProductShell`, so
 *  what is left here is only what a Tauri window genuinely differs by:
 *
 *    · `surface="desktop"` — the IA's desktop-only areas (connection status,
 *      printing, auto-update) are mounted here and excluded from the web,
 *      which is what `iaFor` and `routableNodes` have always been for.
 *    · an account whose "sign out" returns to the sign-in screen (App.tsx)
 *      rather than ending a server session. Until 2026-09-13 there was no
 *      such screen and therefore no such entry; now there is, so the menu
 *      carries it — same shape as the web's, different destination.
 *
 *  Everything the old file did by hand — the company switcher, the palette,
 *  the settings rail, the entitlement boundary, the theme control — the shared
 *  shell does, and does the same way in both places.
 */

import { ProductShell, type Exposure } from "@billgen/ui";

export interface DesktopShellProps {
  /** How much of the product this build offers — see App.tsx. Packaged builds
   *  pass "mvp": a beta tester is not auditing the roadmap, and a page that
   *  does nothing is a bug report she has to write. */
  exposure: Exposure;
  /** The local user, from `POST /auth/desktop-bootstrap` at startup. Passed in
   *  rather than re-fetched: `App` already has it, and asking twice for a
   *  single-user session that cannot change is a request for nothing. */
  displayName?: string;
  email?: string;
  /** Back to the sign-in screen. The tokens are in memory; App drops them. */
  onSignOut?: () => void;
}

export function DesktopShell({ exposure, displayName, email, onSignOut }: DesktopShellProps) {
  return (
    <ProductShell
      surface="desktop"
      exposure={exposure}
      account={{ name: displayName, email, onLogout: onSignOut }}
    />
  );
}
