/** The models offered before anything is edited.
 *
 *  The studio opens here rather than on a blank document. Each card draws a
 *  miniature of the real layout — header position, whether the VAT column is
 *  there, how dense the lines are — because a name and a colour swatch tell you
 *  nothing about what you are choosing, and choosing wrong costs a user the
 *  whole editing session.
 *
 *  The miniature is drawn from the preset's own appearance and block list, not
 *  from a screenshot. A screenshot goes stale the first time a preset changes
 *  and nobody notices until a customer picks a layout they do not get.
 */

import { TEMPLATE_PRESETS, type TemplatePreset } from "./templatePresets";
import { fontStack } from "./templateSchema";

export interface PresetGalleryProps {
  selectedKey?: string;
  onPick: (preset: TemplatePreset) => void;
}

export function PresetGallery({ selectedKey, onPick }: PresetGalleryProps) {
  return (
    <div className="bg-ws-gallery">
      <div className="bg-ws-gallery__head">
        <h2>Start from a model</h2>
        <p>Pick one and change anything. Nothing here is locked.</p>
      </div>

      <ul className="bg-ws-gallery__grid" role="list">
        {TEMPLATE_PRESETS.map((preset, index) => {
          const active = preset.key === selectedKey;
          return (
            <li key={preset.key}>
              <button
                type="button"
                className={`bg-ws-preset${active ? " is-active" : ""}`}
                // Staggered so the grid arrives as a sequence rather than a flash.
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => onPick(preset)}
                aria-pressed={active}
              >
                <PresetThumb preset={preset} />
                <span className="bg-ws-preset__name">{preset.name}</span>
                <span className="bg-ws-preset__tag">{preset.tagline}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A miniature of the layout, built from the preset itself. */
function PresetThumb({ preset }: { preset: TemplatePreset }) {
  const { brand, typography, page } = preset.appearance;
  const shows = (kind: string) => preset.visible.includes(kind as never);
  const align = (preset.properties?.header?.alignment as string) ?? "start";
  const columns =
    (preset.properties?.items?.columns as string[] | undefined)?.length ?? 5;

  const gap = page.density === "compact" ? 3 : page.density === "spacious" ? 7 : 5;
  const pad = page.margins === "narrow" ? 6 : page.margins === "wide" ? 14 : 10;

  return (
    <span
      className="bg-ws-thumb"
      style={{ padding: pad, fontFamily: fontStack(typography.fontFamily) }}
      aria-hidden="true"
    >
      <span
        className="bg-ws-thumb__title"
        style={{
          background: brand.color,
          alignSelf:
            align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start",
          height: Math.max(4, typography.headingSizePt / 4),
        }}
      />
      <span className="bg-ws-thumb__parties">
        <span />
        <span />
      </span>
      <span className="bg-ws-thumb__rows" style={{ gap }}>
        {[0, 1, 2, 3].map((row) => (
          <span key={row} className="bg-ws-thumb__row">
            {Array.from({ length: columns }).map((_, col) => (
              <span
                key={col}
                style={{ flex: col === 0 ? 3 : 1, background: "var(--bg-line)" }}
              />
            ))}
          </span>
        ))}
      </span>
      <span
        className="bg-ws-thumb__totals"
        style={{ borderTopColor: brand.color }}
      />
      {shows("payment") || shows("footer") ? (
        <span className="bg-ws-thumb__foot" />
      ) : null}
    </span>
  );
}
