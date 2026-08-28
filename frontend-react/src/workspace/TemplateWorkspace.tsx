/** The three-column template editor (§14) — blocks · document · properties.
 *
 *  Scaffold — see README.md.
 *
 *  The middle column is `LiveInvoicePreview`, the same component the invoice
 *  composer uses. Sharing it is the point: a studio that previews through its
 *  own renderer lets a user perfect a layout the composer will draw
 *  differently, and neither of them is the PDF.
 *
 *  Saving is deliberately two verbs. `onSave` stores the draft; `onPublish`
 *  cuts a version. Editing a template must not restyle invoices that have
 *  already been issued — those carry a `TemplateSnapshot` — so publishing
 *  affects only what comes next, and the version list says which is which.
 */

import { useState } from "react";
import { Button, Card, PageHeader, Segmented } from "@henrioutai/ui";

import type { Lang } from "../lib/translations";
import { AppearancePanel } from "./AppearancePanel";
import { BlockLibrary } from "./BlockLibrary";
import { LiveInvoicePreview, type PreviewCompany } from "./LiveInvoicePreview";
import { PropertyPanel } from "./PropertyPanel";
import { SAMPLES, sampleByKey } from "./sampleInvoice";
import type { InvoiceTemplate, TemplateBlock } from "./templateSchema";

export interface TemplateWorkspaceProps {
  template: InvoiceTemplate;
  company: PreviewCompany;
  lang?: Lang;
  saving?: boolean;
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
  onChange,
  onSave,
  onPublish,
  onExit,
}: TemplateWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(template.blocks[0]?.id ?? null);
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

  function moveBlock(id: string, direction: -1 | 1) {
    const index = template.blocks.findIndex((block) => block.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= template.blocks.length) return;
    const blocks = [...template.blocks];
    const [moved] = blocks.splice(index, 1);
    blocks.splice(target, 0, moved);
    onChange({ ...template, blocks });
  }

  return (
    <div className="bg-ws-studio">
      <PageHeader
        title={template.name}
        subtitle={`Published v${template.publishedVersion}`}
        onBack={onExit}
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
          <h2>Blocks</h2>
          <BlockLibrary
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
            onMove={moveBlock}
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
