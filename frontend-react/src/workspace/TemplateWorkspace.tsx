/** The template studio — pick a model, then compose it by dragging.
 *
 *  Reshaped 2026-08-28 after Henri reviewed the first version at `/_preview`:
 *  it wanted to be more animated, to compose by clicking and moving rather than
 *  by pressing arrows, to open on models already proposed, and to allow real
 *  colours and more fonts.
 *
 *  What that changed:
 *
 *  * the studio opens on `PresetGallery` instead of a blank document, so the
 *    first act is a choice rather than an assembly;
 *  * `BlockCanvas` replaces the ↑/↓ buttons with a drag grip, and rows slide
 *    out of the way so the drop position is legible before release;
 *  * `AppearancePanel` has a real brand colour and six typefaces.
 *
 *  What did **not** change, and should not: dragging reorders, it never
 *  positions. A canvas with x/y coordinates lets a user build a document
 *  missing a legally required mention, and `core/pdf` is a Jinja template that
 *  could not honour arbitrary geometry anyway. Required blocks cannot be hidden.
 *
 *  Saving stays two verbs. `onSave` stores the draft; `onPublish` cuts a
 *  version. Editing a template must not restyle invoices already issued — those
 *  carry a `TemplateSnapshot` — so publishing affects only what comes next.
 */

import { useState } from "react";
import { Button, Card, PageHeader, Segmented } from "@henrioutai/ui";

import type { Lang } from "../lib/translations";
import { AppearancePanel } from "./AppearancePanel";
import { BlockCanvas } from "./BlockCanvas";
import { LiveInvoicePreview, type PreviewCompany } from "./LiveInvoicePreview";
import { PresetGallery } from "./PresetGallery";
import { PropertyPanel } from "./PropertyPanel";
import { SAMPLES, sampleByKey } from "./sampleInvoice";
import { type DocKind, type TemplatePreset, templateFromPreset } from "./templatePresets";
import type { InvoiceTemplate, TemplateBlock } from "./templateSchema";

export interface TemplateWorkspaceProps {
  template: InvoiceTemplate;
  company: PreviewCompany;
  lang?: Lang;
  saving?: boolean;
  /** Which document this template prints. Decides the title the models stamp
   *  into the header, and nothing else — a look is a look on any document. */
  docKind?: DocKind;
  /** Open straight into the editor — an existing template is being edited
   *  rather than a new one started. */
  skipGallery?: boolean;
  onChange: (template: InvoiceTemplate) => void;
  onSave: () => void;
  onPublish: () => void;
  onExit: () => void;
}

type RailTab = "block" | "appearance";

export function TemplateWorkspace({
  template,
  company,
  lang = "en",
  saving = false,
  docKind = "invoice",
  skipGallery = false,
  onChange,
  onSave,
  onPublish,
  onExit,
}: TemplateWorkspaceProps) {
  const [stage, setStage] = useState<"gallery" | "editor">(
    skipGallery ? "editor" : "gallery",
  );
  const [presetKey, setPresetKey] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(
    template.blocks[0]?.id ?? null,
  );
  const [rail, setRail] = useState<RailTab>("block");
  const [sampleKey, setSampleKey] = useState(SAMPLES[0].key);

  const sample = sampleByKey(sampleKey);
  const selected = template.blocks.find((block) => block.id === selectedId) ?? null;

  function replaceBlock(next: TemplateBlock) {
    onChange({
      ...template,
      blocks: template.blocks.map((block) => (block.id === next.id ? next : block)),
    });
  }

  function pickPreset(preset: TemplatePreset) {
    setPresetKey(preset.key);
    //  The template's identity survives the preset — a user trying models on an
    //  existing template should not find it renamed and un-published underneath
    //  them.
    onChange({
      ...templateFromPreset(preset, {
        id: template.id,
        name: template.name,
        isDefault: template.isDefault,
        docKind,
      }),
      publishedVersion: template.publishedVersion,
    });
  }

  if (stage === "gallery") {
    return (
      <div className="bg-ws-studio">
        <PageHeader
          title={template.name}
          subtitle="Choose a starting point"
          onBack={onExit}
          actions={
            <Button
              variant="primary"
              onClick={() => setStage("editor")}
              disabled={!presetKey}
            >
              {presetKey ? "Customise →" : "Pick a model"}
            </Button>
          }
        />
        <PresetGallery selectedKey={presetKey} onPick={pickPreset} />
      </div>
    );
  }

  return (
    <div className="bg-ws-studio">
      <PageHeader
        title={template.name}
        subtitle={
          template.publishedVersion > 0
            ? `Published v${template.publishedVersion}`
            : "Never published"
        }
        onBack={skipGallery ? onExit : () => setStage("gallery")}
        actions={
          <>
            <Button variant="secondary" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="primary" onClick={onPublish} disabled={saving}>
              Publish
            </Button>
          </>
        }
      />

      <div className="bg-ws-studio__columns">
        <aside className="bg-ws-studio__rail">
          <h2 className="bg-ws-rail__title">Blocks</h2>
          <p className="bg-ws-rail__hint">Drag to reorder. Alt + ↑ ↓ also works.</p>
          <BlockCanvas
            blocks={template.blocks}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setRail("block");
            }}
            onToggleVisible={(id, visible) => {
              const block = template.blocks.find((candidate) => candidate.id === id);
              if (block) replaceBlock({ ...block, visible });
            }}
            onReorder={(blocks) => onChange({ ...template, blocks })}
          />
        </aside>

        <main className="bg-ws-studio__canvas">
          <div className="bg-ws-studio__sample">
            <Segmented
              ariaLabel="Sample invoice"
              value={sampleKey}
              onChange={setSampleKey}
              options={SAMPLES.map((entry) => ({ value: entry.key, label: entry.label }))}
            />
          </div>
          {/*  Keyed on the preset so switching models re-mounts the preview and
              plays its entrance, rather than mutating in place and looking like
              nothing happened. */}
          <div className="bg-ws-studio__paper" key={presetKey ?? "custom"}>
            <LiveInvoicePreview
              draft={sample.draft}
              company={company}
              template={template}
              lang={lang}
              invoiceDiscountPercent={sample.invoiceDiscountPercent}
              selectedBlockId={selectedId}
              onSelectBlock={(id) => {
                setSelectedId(id);
                setRail("block");
              }}
            />
          </div>
        </main>

        <aside className="bg-ws-studio__rail">
          <Segmented
            ariaLabel="Properties or appearance"
            value={rail}
            onChange={setRail}
            options={[
              { value: "block", label: "Block" },
              { value: "appearance", label: "Appearance" },
            ]}
          />
          <Card>
            {rail === "block" ? (
              <PropertyPanel block={selected} onChange={replaceBlock} />
            ) : (
              <AppearancePanel
                appearance={template.appearance}
                onChange={(appearance) => onChange({ ...template, appearance })}
              />
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
