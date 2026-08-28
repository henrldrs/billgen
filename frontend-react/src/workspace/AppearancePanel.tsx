/** Appearance — brand colour, typeface, page.
 *
 *  The scaffold offered three token names and no colour picker, on the grounds
 *  that a raw colour in a stored template is the bypass the palette guard
 *  forbids in component code. That reasoning holds for the **app's chrome** and
 *  it is wrong for a **document**: an invoice is the customer's own stationery,
 *  and a company that cannot put its colour on it will not use the studio.
 *
 *  What survives from the original decision is the shape, which is the part
 *  that mattered:
 *
 *  * **one** brand colour, in one field, resolved into `--bg-brand` at render
 *    time — not a hex per block, which is how a template becomes unreadable and
 *    impossible to re-skin;
 *  * text and border stay **token names**, because those two carry legibility
 *    rather than identity, and a user who sets them by hand sets them wrong;
 *  * the swatches come first and a custom value second, so the common case is
 *    one click and the uncommon one is still possible.
 *
 *  Fonts are constrained to what `core/pdf` can actually draw. A face the
 *  preview shows and the PDF silently substitutes is worse than six that always
 *  match.
 */

import { Field, Select } from "@henrioutai/ui";

import {
  BRAND_SWATCHES,
  FONT_CHOICES,
  type FontChoice,
  type TemplateAppearance,
  fontStack,
} from "./templateSchema";

export interface AppearancePanelProps {
  appearance: TemplateAppearance;
  onChange: (appearance: TemplateAppearance) => void;
}

const TEXT_TOKENS = [
  { value: "--bg-ink", label: "Ink (default)" },
  { value: "--bg-ink-soft", label: "Soft ink" },
];

const BORDER_TOKENS = [
  { value: "--bg-line", label: "Hairline (default)" },
  { value: "--bg-line-strong", label: "Strong" },
  { value: "transparent", label: "None" },
];

/** Relative luminance, so the swatch's tick is drawn in something readable.
 *  Cheap sRGB approximation — this picks black-or-white text, nothing finer. */
function isLight(hex: string): boolean {
  const value = hex.replace("#", "");
  if (value.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
}

export function AppearancePanel({ appearance, onChange }: AppearancePanelProps) {
  function patch(changes: Partial<TemplateAppearance>) {
    onChange({ ...appearance, ...changes });
  }

  function setBrand(changes: Partial<TemplateAppearance["brand"]>) {
    patch({ brand: { ...appearance.brand, ...changes } });
  }

  function setType(changes: Partial<TemplateAppearance["typography"]>) {
    patch({ typography: { ...appearance.typography, ...changes } });
  }

  function setPage(changes: Partial<TemplateAppearance["page"]>) {
    patch({ page: { ...appearance.page, ...changes } });
  }

  return (
    <div className="bg-ws-appearance">
      <Field label="Brand colour" hint="Used for the title, rules and totals.">
        <div className="bg-ws-swatches" role="radiogroup" aria-label="Brand colour">
          {BRAND_SWATCHES.map((swatch) => {
            const active = swatch.value.toLowerCase() === appearance.brand.color.toLowerCase();
            return (
              <button
                key={swatch.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={swatch.label}
                title={swatch.label}
                className={`bg-ws-swatch${active ? " is-active" : ""}${
                  isLight(swatch.value) ? " is-light" : ""
                }`}
                style={{ background: swatch.value }}
                onClick={() => setBrand({ color: swatch.value })}
              />
            );
          })}
        </div>

        <div className="bg-ws-custom-colour">
          <input
            type="color"
            aria-label="Custom brand colour"
            value={appearance.brand.color}
            onChange={(event) => setBrand({ color: event.target.value })}
          />
          <input
            type="text"
            aria-label="Brand colour hex value"
            className="bg-ws-hex"
            value={appearance.brand.color}
            spellCheck={false}
            onChange={(event) => {
              const next = event.target.value.trim();
              //  Typed a character at a time, so anything shorter than a full
              //  hex is kept in the field and simply not applied yet.
              if (/^#[0-9a-fA-F]{6}$/.test(next)) setBrand({ color: next });
              else if (/^#?[0-9a-fA-F]{0,6}$/.test(next)) {
                setBrand({ color: next.startsWith("#") ? next : `#${next}` });
              }
            }}
          />
        </div>
      </Field>

      <Field label="Typeface">
        <div className="bg-ws-fonts" role="radiogroup" aria-label="Typeface">
          {FONT_CHOICES.map((font) => {
            const active = font.value === appearance.typography.fontFamily;
            return (
              <button
                key={font.value}
                type="button"
                role="radio"
                aria-checked={active}
                className={`bg-ws-font${active ? " is-active" : ""}`}
                style={{ fontFamily: font.stack }}
                onClick={() => setType({ fontFamily: font.value as FontChoice })}
              >
                <span className="bg-ws-font__sample">Ag</span>
                <span className="bg-ws-font__name">{font.label}</span>
              </button>
            );
          })}
        </div>
        <p className="bg-ws-note" style={{ fontFamily: fontStack(appearance.typography.fontFamily) }}>
          Invoice 2026/0042 — €1,240.00
        </p>
      </Field>

      <div className="bg-ws-row">
        <Field label="Body size">
          <input
            type="range"
            min={8}
            max={12}
            step={1}
            value={appearance.typography.bodySizePt}
            onChange={(event) => setType({ bodySizePt: Number(event.target.value) })}
          />
          <span className="bg-ws-value">{appearance.typography.bodySizePt}pt</span>
        </Field>
        <Field label="Title size">
          <input
            type="range"
            min={14}
            max={34}
            step={2}
            value={appearance.typography.headingSizePt}
            onChange={(event) => setType({ headingSizePt: Number(event.target.value) })}
          />
          <span className="bg-ws-value">{appearance.typography.headingSizePt}pt</span>
        </Field>
      </div>

      <div className="bg-ws-row">
        <Field label="Text">
          <Select
            value={appearance.brand.textToken}
            onChange={(event) => setBrand({ textToken: event.target.value })}
            options={TEXT_TOKENS}
          />
        </Field>
        <Field label="Rules">
          <Select
            value={appearance.brand.borderToken}
            onChange={(event) => setBrand({ borderToken: event.target.value })}
            options={BORDER_TOKENS}
          />
        </Field>
      </div>

      <div className="bg-ws-row">
        <Field label="Margins">
          <Select
            value={appearance.page.margins}
            onChange={(event) =>
              setPage({ margins: event.target.value as TemplateAppearance["page"]["margins"] })
            }
            options={[
              { value: "narrow", label: "Narrow" },
              { value: "standard", label: "Standard" },
              { value: "wide", label: "Wide" },
            ]}
          />
        </Field>
        <Field label="Density">
          <Select
            value={appearance.page.density}
            onChange={(event) =>
              setPage({ density: event.target.value as TemplateAppearance["page"]["density"] })
            }
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}
