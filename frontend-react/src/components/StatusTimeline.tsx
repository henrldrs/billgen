import type { ReactNode } from "react";

export type TimelineStatus = "done" | "current" | "upcoming" | "failed";

export interface TimelineItem {
  key: string;
  label: ReactNode;
  /** Detail line under the label. */
  description?: ReactNode;
  /** Preformatted timestamp — rendered in mono. */
  timestamp?: string;
  status: TimelineStatus;
}

export interface StatusTimelineProps {
  items: TimelineItem[];
  className?: string;
}

function DotIcon({ status }: { status: TimelineStatus }) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

/**
 * Vertical progress trail — created → validated → sent → delivered. Built
 * for the Peppol delivery status, generic enough for any lifecycle. The
 * current step pulses softly; failed steps go danger and stop the line.
 */
export function StatusTimeline({ items, className }: StatusTimelineProps) {
  const classes = ["bg-timeline", className].filter(Boolean).join(" ");
  return (
    <ol className={classes}>
      {items.map((item, i) => (
        <li key={item.key} className={`bg-timeline__item bg-timeline__item--${item.status}`}>
          <span className="bg-timeline__dot" aria-hidden="true">
            <DotIcon status={item.status} />
          </span>
          {i < items.length - 1 ? <span className="bg-timeline__line" aria-hidden="true" /> : null}
          <div className="bg-timeline__content">
            <div className="bg-timeline__head">
              <span className="bg-timeline__label">{item.label}</span>
              {item.timestamp ? (
                <span className="bg-timeline__time bg-num">{item.timestamp}</span>
              ) : null}
            </div>
            {item.description ? (
              <div className="bg-timeline__desc">{item.description}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
