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
 *    · an account with no `onLogout`. The session is the machine's; there is
 *      nowhere to log out to and no login screen to land on, so the menu
 *      simply carries no such entry.
 *
 *  Everything the old file did by hand — the company switcher, the palette,
 *  the settings rail, the entitlement boundary, the theme control — the shared
 *  shell does, and does the same way in both places.
 */

import { ProductShell } from "@billgen/ui";

export interface DesktopShellProps {
  /** The local user, from `POST /auth/desktop-bootstrap` at startup. Passed in
   *  rather than re-fetched: `App` already has it, and asking twice for a
   *  single-user session that cannot change is a request for nothing. */
  displayName?: string;
  email?: string;
}

export function DesktopShell({ displayName, email }: DesktopShellProps) {
  return (
    <ProductShell surface="desktop" account={{ name: displayName, email }} />
  );
}
