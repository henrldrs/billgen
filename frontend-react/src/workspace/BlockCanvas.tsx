/** The block list you compose by dragging, rather than by pressing arrows.
 *
 *  Replaces the ↑/↓ buttons in the scaffold's BlockLibrary. That version was
 *  correct and nobody would enjoy using it: composing a document by pressing an
 *  arrow four times is not composing, it is operating a machine.
 *
 *  Three things it does not do, each for a reason:
 *
 *  **No drag library.** Pointer events and a transform are enough for a
 *  vertical list of nine, and a dependency here would be the largest thing in
 *  the package by an order of magnitude.
 *
 *  **No freeform x/y.** Dragging reorders; it does not position. A canvas with
 *  coordinates lets a user build a document missing a legally required mention,
 *  and `core/pdf` is a Jinja template that could not honour arbitrary geometry
 *  anyway. This is the one part of the original decision that stays.
 *
 *  **Keyboard still works.** The arrows moved to Alt+↑/↓ on a focused row
 *  rather than disappearing: pointer-only reordering is unusable for anyone who
 *  does not use a pointer, and this list decides what a legal document contains.
 */

import { useCallback, useRef, useState } from "react";

import { BLOCK_LABELS, REQUIRED_BLOCKS, type TemplateBlock } from "./templateSchema";

export interface BlockCanvasProps {
  blocks: TemplateBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
  onReorder: (blocks: TemplateBlock[]) => void;
}

interface DragState {
  id: string;
  fromIndex: number;
  overIndex: number;
  pointerY: number;
  startY: number;
}

export function BlockCanvas({
  blocks,
  selectedId,
  onSelect,
  onToggleVisible,
  onReorder,
}: BlockCanvasProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const listRef = useRef<HTMLUListElement>(null);

  /** Which slot the pointer is currently over, from the measured row boxes.
   *  Measured rather than computed from a fixed row height: rows differ in
   *  height once a name wraps, and a fixed guess makes the drop land a row off. */
  const indexAtY = useCallback(
    (y: number) => {
      const entries = blocks
        .map((block, index) => ({ index, el: rowRefs.current.get(block.id) }))
        .filter((entry): entry is { index: number; el: HTMLLIElement } => Boolean(entry.el));
      for (const { index, el } of entries) {
        const box = el.getBoundingClientRect();
        if (y < box.top + box.height / 2) return index;
      }
      return blocks.length - 1;
    },
    [blocks],
  );

  //  The live drag, readable synchronously.
  //
  //  An earlier version attached window listeners from a useEffect keyed on the
  //  drag state. That only works because a human takes milliseconds to move
  //  after pressing: the listeners are not attached until React has re-rendered,
  //  so any pointermove arriving in the same tick as the pointerdown is simply
  //  lost. Pointer capture has no such gap — the grip receives every subsequent
  //  event for that pointer, wherever it travels — and it also survives the
  //  pointer leaving the window, which the window-listener version did not.
  const dragRef = useRef<DragState | null>(null);

  const setDragBoth = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  function startDrag(event: React.PointerEvent, block: TemplateBlock, index: number) {
    //  Only the grip starts a drag. A whole-row drag makes the visibility
    //  switch and the row's own click impossible to hit reliably.
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(block.id);
    setDragBoth({
      id: block.id,
      fromIndex: index,
      overIndex: index,
      pointerY: event.clientY,
      startY: event.clientY,
    });
  }

  function moveDrag(event: React.PointerEvent) {
    const current = dragRef.current;
    if (!current) return;
    setDragBoth({
      ...current,
      pointerY: event.clientY,
      overIndex: indexAtY(event.clientY),
    });
  }

  function endDrag(event: React.PointerEvent) {
    const current = dragRef.current;
    if (!current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current.overIndex !== current.fromIndex) {
      const next = [...blocks];
      const [moved] = next.splice(current.fromIndex, 1);
      next.splice(current.overIndex, 0, moved);
      onReorder(next);
    }
    setDragBoth(null);
  }

  function nudge(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onReorder(next);
  }

  return (
    <ul className="bg-ws-canvas" ref={listRef} role="list">
      {blocks.map((block, index) => {
        const required = REQUIRED_BLOCKS.includes(block.kind);
        const dragging = drag?.id === block.id;

        //  Rows between the source and the destination slide out of the way by
        //  exactly one row, which is what makes the drop position legible
        //  before the pointer is released.
        let shift = 0;
        if (drag && !dragging) {
          const { fromIndex, overIndex } = drag;
          if (fromIndex < overIndex && index > fromIndex && index <= overIndex) shift = -1;
          if (fromIndex > overIndex && index >= overIndex && index < fromIndex) shift = 1;
        }

        return (
          <li
            key={block.id}
            ref={(el) => {
              if (el) rowRefs.current.set(block.id, el);
              else rowRefs.current.delete(block.id);
            }}
            className={[
              "bg-ws-canvas__row",
              dragging ? "is-dragging" : "",
              shift !== 0 ? "is-shifted" : "",
              block.id === selectedId ? "is-selected" : "",
              block.visible ? "" : "is-hidden",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              dragging
                ? { transform: `translateY(${drag.pointerY - drag.startY}px)` }
                : shift !== 0
                  ? { transform: `translateY(${shift * 100}%)` }
                  : undefined
            }
            onKeyDown={(event) => {
              if (!event.altKey) return;
              if (event.key === "ArrowUp") {
                event.preventDefault();
                nudge(index, -1);
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                nudge(index, 1);
              }
            }}
          >
            <button
              type="button"
              className="bg-ws-canvas__grip"
              aria-label={`Reorder ${BLOCK_LABELS[block.kind]}. Alt plus arrow keys also works.`}
              onPointerDown={(event) => startDrag(event, block, index)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span aria-hidden="true">⠿</span>
            </button>

            <button
              type="button"
              className="bg-ws-canvas__name"
              onClick={() => onSelect(block.id)}
              aria-current={block.id === selectedId}
            >
              {BLOCK_LABELS[block.kind]}
              {required ? <em className="bg-ws-canvas__req">required</em> : null}
            </button>

            <label className="bg-ws-canvas__toggle">
              <input
                type="checkbox"
                checked={block.visible}
                //  A required block cannot be hidden, and the control says so
                //  by being disabled rather than by failing on save.
                disabled={required}
                onChange={(event) => onToggleVisible(block.id, event.target.checked)}
              />
              <span className="bg-ws-canvas__track" aria-hidden="true" />
              <span className="bg-sr-only">
                {block.visible ? "Visible" : "Hidden"} — {BLOCK_LABELS[block.kind]}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
