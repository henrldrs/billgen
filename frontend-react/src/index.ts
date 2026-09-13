/** `@billgen/ui`'s public surface.
 *
 *  Two layers on purpose. `internal.ts` is everything the package exports that
 *  the shell itself consumes — panels, hooks, the IA, the design system. The
 *  shell below imports from *that* file rather than from this one, so adding
 *  the shell to the package did not make the package import itself.
 *
 *  The shell lives here because there is one of it. `frontend-saas` and
 *  `frontend-electron` differ by an adapter and a router, not by a second
 *  implementation of the navigation (T-19).
 */

export * from "./internal";

// The shell, shared by both surfaces — see shell/ProductShell.tsx for what a
// platform has to supply and what it deliberately does not.
//
// Named ProductShell, not AppShell: the design system already exports an
// `AppShell` layout primitive that every surface imports `as Shell`, and two
// different AppShells out of one barrel is how a consumer gets the wrong one.
export {
  ProductShell,
  type PlatformAdapter,
  type ShellContext,
} from "./shell/ProductShell";
export { buildAppRoutes, InvoiceBuilderRoute } from "./shell/routes";

// Theme: one remap of the token layer, persisted per surface by localStorage.
// Shared because it was byte-identical in both shells apart from a comment.
export { applyTheme, resolveTheme, storedTheme, useTheme } from "./lib/theme";

// The other appearance preferences — density, text size, motion, translucency
// — applied the same way, before first paint, by both shells.
export {
  applyAppearance,
  applyStoredAppearance,
  storedAppearance,
  useAppearance,
  type Appearance,
} from "./lib/preferences";

// The desktop's sign-in screen and the tour flag. Both are the shell's to
// drive: the boot state machine lives in frontend-electron, the tour opens
// itself from ProductShell once the flag says it is owed.
export {
  DesktopSignIn,
  type DesktopAccount,
  type DesktopSignInProps,
  type DesktopSignInState,
} from "./shell/DesktopSignIn";
export { markTourDone, requestTour, tourPending } from "./lib/tour";
