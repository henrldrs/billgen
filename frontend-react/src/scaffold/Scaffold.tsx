/** Scaffold kit — the visible placeholder layer for unwired product surface.
 *
 *  These components exist so that an area with no backend LOOKS like it has no
 *  backend. They deliberately do not use @henrioutai/ui: reusing Card, Button
 *  or Table here would make an empty stub read as a finished feature, which is
 *  exactly the failure mode this kit prevents.
 *
 *  Every screen renders its own endpoint ledger, so the gap is stated on the
 *  page rather than buried in a roadmap nobody opens.
 */

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { BackendStatus, IaNode } from "./ia";

// ------------------------------------------------------------------ the page

export interface ScaffoldPageProps {
  /** The IA node this screen stands in for — supplies title, path and gaps. */
  node: IaNode;
  /** Sketch of the intended layout, drawn with the raw elements below. */
  children?: ReactNode;
}

const BANNER: Record<BackendStatus, string> = {
  // A `wired` node reaching the scaffold means the server is ready and only the
  // screen is missing — the cheapest work on the board, so it gets its own
  // colour rather than being lumped in with the genuinely blocked areas.
  wired: "backend ready — this screen is simply not built yet",
  partial: "partially wired — some of this screen has no server behind it",
  none: "not wired — nothing on the server answers this screen",
};

const BANNER_CLASS: Record<BackendStatus, string> = {
  wired: "sk-page__banner sk-page__banner--ready",
  partial: "sk-page__banner sk-page__banner--partial",
  none: "sk-page__banner",
};

const ARIA: Record<BackendStatus, string> = {
  wired: "backend ready, screen not built",
  partial: "partially wired",
  none: "not wired",
};

export function ScaffoldPage({ node, children }: ScaffoldPageProps) {
  return (
    <section className="sk-page" aria-label={`${node.label} (${ARIA[node.status]})`}>
      <p className={BANNER_CLASS[node.status]}>⚠ {BANNER[node.status]}</p>

      <div className="sk-page__body">
        <h1 className="sk-page__title">{node.label}</h1>
        <p className="sk-page__path">
          /app/{node.path ?? "—"} · layer {node.layer} ·{" "}
          <ScaffoldBadge status={node.status} />
        </p>

        {node.note ? <p className="sk-note">{node.note}</p> : null}

        {node.endpoints?.length ? (
          <EndpointLedger title="Endpoints this screen can already use" items={node.endpoints} have />
        ) : null}

        {node.missing?.length ? (
          <EndpointLedger title="Missing before this screen can be real" items={node.missing} />
        ) : null}

        {children ? (
          <>
            <hr className="sk-hr" />
            <h2 className="sk-h2">Intended layout</h2>
            {children}
          </>
        ) : null}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- the block

export interface ScaffoldBlockProps {
  /** The IA node this slice stands in for — supplies title, path and gaps. */
  node: IaNode;
  /** Override the node's label when the block is a slice of it rather than
   *  the whole node ("Tags", not "Client groups"). */
  title?: string;
  /** Narrow the ledger to this slice's own gap. A block titled "Totals" must
   *  not claim that a missing Document model is what blocks totals — that is
   *  the node's list, not the slice's, and printing it whole turns a precise
   *  ledger into noise. Defaults to the node's full `missing`. */
  missing?: string[];
  /** Why this slice is here, in the context of the screen hosting it. */
  children?: ReactNode;
}

/**
 * A ScaffoldPage-shaped hole inside a screen that is otherwise real.
 *
 * Client 360 is the case this exists for: identity, invoice history and the
 * audit trail are wired, while tags, documents, risk flags and GDPR each map
 * to a model that does not exist. Rendering those with the design system would
 * be a lie, and rendering the whole screen as a scaffold would hide three
 * working features. So the gap is quarantined to the block that has it.
 *
 * Same banner and same ledger as ScaffoldPage — the block still states its own
 * missing endpoints — but headed by an h3 rather than an h1, because a page
 * that already has a title does not want four more.
 */
/** Which parts of the product the running build exposes. A packaged desktop
 *  build hands over `"mvp"`; a dev build shows `"all"`. Set once by the shell,
 *  read by every ScaffoldBlock — a scaffold *inside* a wired screen (Client
 *  360's tags, GDPR, totals) is the case `MVP_SURFACE` cannot reach, because
 *  that list gates screens, and on 2026-09-11 three of those banners were
 *  photographed on a handed-over build. */
export type ScaffoldExposure = "all" | "wired" | "mvp";
const ScaffoldExposureContext = createContext<ScaffoldExposure>("all");

export function ScaffoldExposureProvider({
  exposure,
  children,
}: {
  exposure: ScaffoldExposure;
  children: ReactNode;
}) {
  return (
    <ScaffoldExposureContext.Provider value={exposure}>{children}</ScaffoldExposureContext.Provider>
  );
}

export function useScaffoldExposure(): ScaffoldExposure {
  return useContext(ScaffoldExposureContext);
}

export function ScaffoldBlock({
  node,
  title,
  missing,
  children,
}: ScaffoldBlockProps) {
  const exposure = useScaffoldExposure();
  const gaps = missing ?? node.missing;
  //  On a handed-over build the block is simply absent. Not disabled, not
  //  greyed: a customer is not owed a ledger of what her software lacks.
  if (exposure === "mvp") return null;
  return (
    <section
      className="sk-page sk-block"
      aria-label={`${title ?? node.label} (${ARIA[node.status]})`}
    >
      <p className={BANNER_CLASS[node.status]}>⚠ {BANNER[node.status]}</p>

      <div className="sk-page__body sk-block__body">
        <h3 className="sk-block__title">{title ?? node.label}</h3>
        <p className="sk-page__path">
          /app/{node.path ?? "—"} · <ScaffoldBadge status={node.status} />
        </p>

        {children}

        {gaps?.length ? (
          <EndpointLedger title="Missing before this is real" items={gaps} />
        ) : null}
      </div>
    </section>
  );
}

// --------------------------------------------------------------- the ledger

function EndpointLedger({
  title,
  items,
  have = false,
}: {
  title: string;
  items: string[];
  have?: boolean;
}) {
  return (
    <div className={have ? "sk-endpoints sk-endpoints--have" : "sk-endpoints"}>
      <p className="sk-endpoints__head">{title}</p>
      <ul className="sk-endpoints__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// -------------------------------------------------------------- dead controls

export interface ScaffoldButtonProps {
  children: ReactNode;
  /** What this control would do once a backend exists. Shown as its title. */
  wouldDo?: string;
}

/**
 * A control that is visibly inert. It has no onClick, is `disabled`, shows a
 * not-allowed cursor and no hover or press state — so the missing wiring is
 * legible before anyone clicks it, not after.
 */
export function ScaffoldButton({ children, wouldDo }: ScaffoldButtonProps) {
  return (
    <button
      type="button"
      className="sk-button"
      disabled
      aria-disabled="true"
      title={wouldDo ? `Not wired — would ${wouldDo}` : "Not wired"}
    >
      {children}
    </button>
  );
}

export function ScaffoldField({
  label,
  placeholder,
  as = "input",
}: {
  label: string;
  placeholder?: string;
  as?: "input" | "select" | "textarea";
}) {
  const shared = { disabled: true, placeholder, "aria-disabled": true as const };
  return (
    <p className="sk-field">
      <label className="sk-field__label">{label}</label>
      {as === "textarea" ? (
        <textarea className="sk-textarea" rows={3} {...shared} />
      ) : as === "select" ? (
        <select className="sk-select" disabled aria-disabled="true">
          <option>—</option>
        </select>
      ) : (
        <input className="sk-input" {...shared} />
      )}
    </p>
  );
}

/** A table shape with no rows behind it — columns only, filled with dashes. */
export function ScaffoldTable({
  columns,
  rows = 3,
}: {
  columns: string[];
  rows?: number;
}) {
  return (
    <table className="sk-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column) => (
              <td key={column}>no data source</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ScaffoldHeading({ children }: { children: ReactNode }) {
  return <h2 className="sk-h2">{children}</h2>;
}

export function ScaffoldNote({ children }: { children: ReactNode }) {
  return <p className="sk-note">{children}</p>;
}

// ---------------------------------------------------------------- indicators

const BADGE: Record<BackendStatus, { className: string; label: string }> = {
  wired: { className: "sk-badge sk-badge--ready", label: "ui todo" },
  partial: { className: "sk-badge sk-badge--partial", label: "partial" },
  none: { className: "sk-badge sk-badge--none", label: "no backend" },
};

/**
 * Inline status marker. On a `wired` node this only ever appears inside a
 * ScaffoldPage — i.e. the server is ready and the screen is the missing half.
 * Real screens pass nothing and render no badge at all.
 */
export function ScaffoldBadge({ status }: { status: BackendStatus }) {
  const { className, label } = BADGE[status];
  return <span className={className}>{label}</span>;
}

/** Small square marker for nav items pointing at unwired destinations. */
export function ScaffoldNavDot({ status }: { status: BackendStatus }) {
  if (status === "wired") return null;
  return (
    <span
      className={status === "partial" ? "sk-navdot sk-navdot--partial" : "sk-navdot"}
      aria-label={status === "partial" ? "partially wired" : "not wired"}
      role="img"
    />
  );
}

export function ScaffoldMeter({ percent }: { percent: number }) {
  return (
    <span className="sk-meter" role="img" aria-label={`${percent}% wired`}>
      <span className="sk-meter__fill" style={{ width: `${percent}%` }} />
    </span>
  );
}
