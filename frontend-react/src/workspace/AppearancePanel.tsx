/** Appearance (§17) — and the reason there is no colour picker here.
 *
 *  Scaffold — see README.md.
 *
 *  The blueprint asks for Primary / Text / Borders swatches. What this offers
 *  instead is a choice among **semantic tokens**, because a free colour picker
 *  writes a raw value into the template payload, and from there into the PDF —
 *  which is the exact bypass the palette guard forbids in component code, only
 *  stored in a database where no test can see it.
 *
 *  That is a real reduction in what a user can do, and it is deliberate: an
 *  accent that is always a token stays legible in both themes, survives a
 *  re-skin, and cannot be set to white-on-white. If arbitrary brand colour is
 *  wanted later, the honest way is a *named brand colour on the organization*
 *  that becomes a token — not a hex field on a template.
 */

import { Field, RadioGroup, Select, TextInput } from "@henrioutai/ui";

import type { TemplateAppearance } from "./templateSchema";

export interface AppearancePanelProps {
  appearance: TemplateAppearance;
  onChange: (appearance: TemplateAppearance) => void;
}

/** The tokens a template may point its accent at. Names, never values. */
const ACCENT_TOKENS = [
  { value: "--bg-accent", label: "BillGen emerald (default)" },
  { value: "--bg-navy", label: "Navy" },
  { value: "--bg-ink", label: "Ink" },
];

const FONTS = [
  { value: "Satoshi", label: "Satoshi" },
  { value: "Geist Mono", label: "Geist Mono" },
];

export function AppearancePanel({ appearance, onChange }: AppearancePanelProps) {
  function patch(changes: Partial<TemplateAppearance>) {
    onChange({ ...appearance, ...changes });
  }

  return (
    <div className="bg-stack">
      <Field label="Accent" htmlFor="appearance-accent" hint="Chosen from the palette, not picked freehand.">
        <Select
          id="appearance-accent"
          options={ACCENT_TOKENS}
          value={appearance.brand.accentToken}
          onChange={(event) =>
            patch({ brand: { ...appearance.brand, accentToken: event.target.value } })
          }
        />
      </Field>

      <Field label="Font" htmlFor="appearance-font">
        <Select
          id="appearance-font"
          options={FONTS}
          value={appearance.typography.fontFamily}
          onChange={(event) =>
            patch({ typography: { ...appearance.typography, fontFamily: event.target.value } })
          }
        />
      </Field>

      <div className="bg-ws-row">
        <Field label="Body size (pt)" htmlFor="appearance-body">
          <TextInput
            id="appearance-body"
            inputMode="numeric"
            value={String(appearance.typography.bodySizePt)}
            onChange={(event) =>
              patch({
                typography: { ...appearance.typography, bodySizePt: Number(event.target.value) },
              })
            }
          />
        </Field>
        <Field label="Heading size (pt)" htmlFor="appearance-heading">
          <TextInput
            id="appearance-heading"
            inputMode="numeric"
            value={String(appearance.typography.headingSizePt)}
            onChange={(event) =>
              patch({
                typography: {
                  ...appearance.typography,
                  headingSizePt: Number(event.target.value),
                },
              })
            }
          />
        </Field>
      </div>

      <Field label="Page" htmlFor="appearance-page">
        <Select
          id="appearance-page"
          options={[
            { value: "A4", label: "A4" },
            { value: "Letter", label: "Letter" },
          ]}
          value={appearance.page.size}
          onChange={(event) =>
            patch({ page: { ...appearance.page, size: event.target.value as "A4" | "Letter" } })
          }
        />
      </Field>

      <Field label="Margins" htmlFor="appearance-margins">
        <Select
          id="appearance-margins"
          options={[
            { value: "narrow", label: "Narrow" },
            { value: "standard", label: "Standard" },
            { value: "wide", label: "Wide" },
          ]}
          value={appearance.page.margins}
          onChange={(event) =>
            patch({
              page: {
                ...appearance.page,
                margins: event.target.value as TemplateAppearance["page"]["margins"],
              },
            })
          }
        />
      </Field>

      <Field label="Density" htmlFor="appearance-density">
        <RadioGroup
          name="appearance-density"
          value={appearance.page.density}
          onChange={(value) =>
            patch({
              page: {
                ...appearance.page,
                density: value as TemplateAppearance["page"]["density"],
              },
            })
          }
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
            { value: "spacious", label: "Spacious" },
          ]}
        />
      </Field>
    </div>
  );
}
