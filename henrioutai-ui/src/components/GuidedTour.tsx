import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export interface TourStep {
  key: string;
  /**
   * CSS selector of the element this step points at. Resolved on every step
   * change and on resize, never cached: the tour runs over a live app whose
   * layout moves. When the selector matches nothing (or matches an element
   * with no box, which is what jsdom reports) the card renders centered with
   * no spotlight — a missing anchor degrades to a plain explanation, never to
   * a broken overlay.
   */
  anchor?: string;
  title: ReactNode;
  body: ReactNode;
  /** Where the card sits relative to the anchor. Flips when it would not fit. */
  placement?: "top" | "bottom" | "left" | "right";
}

export interface GuidedTourLabels {
  next: string;
  back: string;
  skip: string;
  finish: string;
  /** "Step 2 of 6" — the app formats it, so the order of words is its own. */
  stepOf: (index: number, count: number) => string;
  /** Accessible name of the dialog. */
  dialog: string;
}

const DEFAULT_LABELS: GuidedTourLabels = {
  next: "Next",
  back: "Back",
  skip: "Skip the tour",
  finish: "Done",
  stepOf: (index, count) => `Step ${index} of ${count}`,
  dialog: "Guided tour",
};

export interface GuidedTourProps {
  open: boolean;
  steps: TourStep[];
  /** `finished` after the last step's button, `skipped` for Escape or Skip. */
  onClose: (reason: "finished" | "skipped") => void;
  /** Fires before a step is measured, so the app can navigate to where the
   *  anchor lives. */
  onStepChange?: (step: TourStep, index: number) => void;
  labels?: Partial<GuidedTourLabels>;
  className?: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOT_PAD = 6;
const CARD_GAP = 14;
const EDGE = 12;
const CARD_WIDTH = 352;

function measure(selector: string | undefined): Box | null {
  if (!selector || typeof document === "undefined") return null;
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

/**
 * Coach marks over a live screen: a spotlight cut out of a dimmed backdrop,
 * and a small overlay-glass card beside it with one thing to say. Steps are
 * declared with a CSS selector rather than a ref, so the tour can point at
 * elements it does not own — the nav bar, the create button, a card on the
 * dashboard — without threading props through every layer between them.
 *
 * Non-interactive on purpose: the spotlight shows where something is, the
 * card says what it does, and the person tries it after the tour. A tour
 * that lets you click the thing it is pointing at has to survive the
 * navigation that follows, which is a different and much larger component.
 *
 * Keyboard: Escape skips, ← and → move between steps. Focus lands on the
 * card when the tour opens and returns to the body when it closes.
 */
export function GuidedTour({
  open,
  steps,
  onClose,
  onStepChange,
  labels: labelOverrides,
  className,
}: GuidedTourProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[index];
  const count = steps.length;

  // A fresh open starts at the first step, whatever the last run ended on.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    onStepChange?.(step, index);
    // `onStepChange` may navigate; the anchor exists one frame later.
  }, [open, step, index, onStepChange]);

  const remeasure = useCallback(() => {
    if (!open || !step) return;
    const next = measure(step.anchor);
    setBox(next);
    if (next && step.anchor) {
      const element = document.querySelector(step.anchor);
      // jsdom has no scrollIntoView; a browser does, and a spotlight on an
      // element below the fold is a spotlight on nothing.
      if (element && typeof (element as HTMLElement).scrollIntoView === "function") {
        (element as HTMLElement).scrollIntoView({ block: "center", inline: "nearest" });
      }
    }
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open) return;
    remeasure();
    const frame = requestAnimationFrame(remeasure);
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [open, remeasure]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
  }, [open, index]);

  const last = index >= count - 1;
  const next = useCallback(() => {
    if (last) onClose("finished");
    else setIndex((current) => Math.min(current + 1, count - 1));
  }, [last, count, onClose]);
  const back = useCallback(() => setIndex((current) => Math.max(current - 1, 0)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose("skipped");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back, onClose]);

  if (!open || !step || typeof document === "undefined") return null;

  const spot = box
    ? {
        top: box.top - SPOT_PAD,
        left: box.left - SPOT_PAD,
        width: box.width + SPOT_PAD * 2,
        height: box.height + SPOT_PAD * 2,
      }
    : null;

  const cardStyle = spot ? placeCard(spot, step.placement ?? "bottom") : undefined;

  const classes = ["bg-tour", spot ? "" : "bg-tour--centered", className].filter(Boolean).join(" ");

  return createPortal(
    <div className={classes}>
      {spot ? (
        <div
          className="bg-tour__spot"
          aria-hidden="true"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : (
        <div className="bg-tour__dim" aria-hidden="true" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialog}
        tabIndex={-1}
        className="bg-tour__card"
        style={cardStyle}
      >
        <div className="bg-tour__eyebrow">{labels.stepOf(index + 1, count)}</div>
        <h2 className="bg-tour__title">{step.title}</h2>
        <div className="bg-tour__body">{step.body}</div>
        <div className="bg-tour__footer">
          <ol className="bg-tour__dots" aria-hidden="true">
            {steps.map((item, i) => (
              <li
                key={item.key}
                className={["bg-tour__dot", i === index ? "bg-tour__dot--active" : ""]
                  .filter(Boolean)
                  .join(" ")}
              />
            ))}
          </ol>
          <div className="bg-tour__actions">
            <button type="button" className="bg-button bg-button--ghost bg-button--sm" onClick={() => onClose("skipped")}>
              {labels.skip}
            </button>
            {index > 0 ? (
              <button type="button" className="bg-button bg-button--secondary bg-button--sm" onClick={back}>
                {labels.back}
              </button>
            ) : null}
            <button type="button" className="bg-button bg-button--primary bg-button--sm" onClick={next}>
              {last ? labels.finish : labels.next}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Fixed-position coordinates for the card, flipped when the preferred side
 *  has no room and clamped so no edge leaves the viewport. */
function placeCard(spot: Box, preferred: NonNullable<TourStep["placement"]>) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(CARD_WIDTH, vw - EDGE * 2);
  // The card's height is unknown before paint; 220 is a typical card and only
  // decides which side to try first — the clamp below keeps it on screen.
  const assumedHeight = 220;

  const roomBelow = vh - (spot.top + spot.height);
  const roomAbove = spot.top;
  const roomRight = vw - (spot.left + spot.width);
  const roomLeft = spot.left;

  let placement = preferred;
  if (placement === "bottom" && roomBelow < assumedHeight + CARD_GAP && roomAbove > roomBelow) placement = "top";
  else if (placement === "top" && roomAbove < assumedHeight + CARD_GAP && roomBelow > roomAbove) placement = "bottom";
  else if (placement === "right" && roomRight < cardWidth + CARD_GAP) placement = roomLeft >= cardWidth + CARD_GAP ? "left" : "bottom";
  else if (placement === "left" && roomLeft < cardWidth + CARD_GAP) placement = roomRight >= cardWidth + CARD_GAP ? "right" : "bottom";

  let top: number;
  let left: number;
  if (placement === "bottom") {
    top = spot.top + spot.height + CARD_GAP;
    left = spot.left + spot.width / 2 - cardWidth / 2;
  } else if (placement === "top") {
    top = spot.top - CARD_GAP - assumedHeight;
    left = spot.left + spot.width / 2 - cardWidth / 2;
  } else if (placement === "right") {
    top = spot.top;
    left = spot.left + spot.width + CARD_GAP;
  } else {
    top = spot.top;
    left = spot.left - CARD_GAP - cardWidth;
  }

  left = Math.max(EDGE, Math.min(left, vw - cardWidth - EDGE));
  top = Math.max(EDGE, Math.min(top, vh - assumedHeight - EDGE));

  return { top, left, width: cardWidth };
}
