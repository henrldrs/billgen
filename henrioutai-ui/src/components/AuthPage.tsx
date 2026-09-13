import type { ReactNode } from "react";

import { LogoMark } from "./LogoMark";

export interface AuthPageProps {
  /** The product name beside the mark. */
  productName?: string;
  /** One line under the name on the brand panel. */
  tagline?: ReactNode;
  /** Free content under the tagline — three short reasons, a version line. */
  aside?: ReactNode;
  /** The card: a sign-in form, an account to continue as, a startup error. */
  children: ReactNode;
  /** Under the card, outside it — language and theme controls belong here so
   *  a person who cannot read the card can still change what it is written in. */
  footer?: ReactNode;
  className?: string;
}

/**
 * The frame every sign-in surface renders inside: a brand panel on the deep
 * field beside a glass card on paper. One layout for the web's password form
 * and the desktop's "continue as" screen, so the two products a person might
 * open on the same day look like one.
 *
 * Presentational only. It knows nothing about sessions; the card's content
 * and its footer are the caller's.
 */
export function AuthPage({
  productName = "BillGen",
  tagline,
  aside,
  children,
  footer,
  className,
}: AuthPageProps) {
  const classes = ["bg-auth", className].filter(Boolean).join(" ");
  return (
    <main className={classes}>
      <section className="bg-auth__brand" aria-label={productName}>
        <div className="bg-auth__mark">
          <LogoMark size={44} />
          <span className="bg-auth__name">{productName}</span>
        </div>
        {tagline != null ? <p className="bg-auth__tagline">{tagline}</p> : null}
        {aside != null ? <div className="bg-auth__aside">{aside}</div> : null}
      </section>
      <section className="bg-auth__stage">
        <div className="bg-auth__card bg-panel">{children}</div>
        {footer != null ? <div className="bg-auth__footer">{footer}</div> : null}
      </section>
    </main>
  );
}
