/** The left rail of the template editor (§14) — block list and reordering.
 *
 *  Scaffold — see README.md.
 *
 *  It is a *list*, not a palette of things to drag onto a page. Every block a
 *  template can contain already exists in `defaultBlocks()`; the studio
 *  reorders and toggles them. That is the no-freeform-positioning rule from
 *  `templateSchema.ts` made visible in the UI, and it is why there is no
 *  "add block" affordance to look for.
 *
 *  Blocks in `REQUIRED_BLOCKS` render without a visibility toggle. A user who
 *  can hide the parties block can produce a document that is not an invoice.
 */

import { Button, Switch } from "@henrioutai/ui";

import { BLOCK_LABELS, REQUIRED_BLOCKS, type TemplateBlock } from "./templateSchema";

export interface BlockLibraryProps {
  blocks: TemplateBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

export function BlockLibrary({
  blocks,
  selectedId,
  onSelect,
  onToggleVisible,
  onMove,
}: BlockLibraryProps) {
  return (
    <ul className="bg-ws-blocks">
      {blocks.map((block, index) => {
        const required = REQUIRED_BLOCKS.includes(block.kind);
        return (
          <li
            key={block.id}
            className={selectedId === block.id ? "bg-ws-blocks__item--selected" : undefined}
          >
            <button type="button" onClick={() => onSelect(block.id)}>
              {BLOCK_LABELS[block.kind]}
            </button>

            <div className="bg-ws-blocks__controls">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => onMove(block.id, -1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Move down"
                disabled={index === blocks.length - 1}
                onClick={() => onMove(block.id, 1)}
              >
                ↓
              </Button>
              {required ? (
                <span className="bg-ws-blocks__required">Required</span>
              ) : (
                <Switch
                  checked={block.visible}
                  onChange={(checked) => onToggleVisible(block.id, checked)}
                  aria-label={`Show ${BLOCK_LABELS[block.kind]}`}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
