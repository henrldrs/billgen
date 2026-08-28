/** Invoice templates — the gallery, and the studio behind it.
 *
 *  The first screen that mounts `TemplateWorkspace` against real endpoints
 *  rather than literals.
 *
 *  **The tier gate is drawn twice, on purpose, and they are different claims.**
 *  This screen hides the editor below Business because sending someone into a
 *  designer whose every save returns 402 is a worse experience than telling
 *  them up front. The server refuses the write regardless of what rendered —
 *  `pdf_templates_premium` is checked on all five write endpoints. A hidden
 *  button is UX; the refused request is the rule.
 *
 *  Reads are open on every tier, which is why a downgraded organization still
 *  sees the templates it built, with an upgrade prompt over them instead of an
 *  empty screen. Their issued invoices are unaffected either way: each carries
 *  its own `template_snapshot`.
 */

import { useState } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  List,
  LoadingScreen,
  PageHeader,
} from "@henrioutai/ui";
import {
  hasFeature,
  useEntitlements,
  useCreateTemplate,
  usePublishTemplate,
  useTemplates,
  useUpdateTemplate,
  type TemplateUpdateRequest,
} from "@billgen/ui";
import {
  TemplateWorkspace,
  defaultTemplate,
  type InvoiceTemplate,
  type PreviewCompany,
} from "@billgen/ui/src/workspace";

export interface TemplateStudioScreenProps {
  companyId?: string;
  company?: PreviewCompany;
  lang?: "en" | "fr" | "nl" | "es";
}

/** Wire shape → the studio's shape.
 *
 *  These two disagree and the difference is not an accident: the server stores
 *  a flat appearance (`brand_color`, `font_family`, `page_size`) and the studio
 *  edits a nested one (`brand.color`, `typography.fontFamily`). Mapping here
 *  keeps the seam in one function instead of spread through the editor.
 */
function toStudio(row: {
  id: string;
  name: string;
  is_default: boolean;
  published_version: number | null;
  blocks: unknown[];
  appearance: Record<string, unknown>;
}): InvoiceTemplate {
  const a = row.appearance ?? {};
  const base = defaultTemplate();
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    publishedVersion: row.published_version ?? 0,
    updatedAt: new Date().toISOString(),
    blocks: (row.blocks?.length ? row.blocks : base.blocks) as InvoiceTemplate["blocks"],
    appearance: {
      brand: {
        color: (a.brand_color as string) ?? base.appearance.brand.color,
        textToken: (a.text_token as string) ?? base.appearance.brand.textToken,
        borderToken: (a.border_token as string) ?? base.appearance.brand.borderToken,
      },
      typography: {
        fontFamily:
          (a.font_family as InvoiceTemplate["appearance"]["typography"]["fontFamily"]) ??
          base.appearance.typography.fontFamily,
        bodySizePt: (a.body_size_pt as number) ?? base.appearance.typography.bodySizePt,
        headingSizePt:
          (a.heading_size_pt as number) ?? base.appearance.typography.headingSizePt,
      },
      page: {
        size: (a.page_size as "A4" | "Letter") ?? base.appearance.page.size,
        margins:
          (a.margins as InvoiceTemplate["appearance"]["page"]["margins"]) ??
          base.appearance.page.margins,
        density:
          (a.density as InvoiceTemplate["appearance"]["page"]["density"]) ??
          base.appearance.page.density,
      },
    },
  };
}

function fromStudio(template: InvoiceTemplate): TemplateUpdateRequest {
  return {
    name: template.name,
    //  `TemplateBlock` is a discriminated union with a typed property set per
    //  kind; the generated request type has an index signature. Same JSON,
    //  and TypeScript cannot prove it — so the cast is here, at the one seam,
    //  rather than by widening the editor's types to match the wire's.
    blocks: template.blocks as unknown as TemplateUpdateRequest["blocks"],
    appearance: {
      brand_color: template.appearance.brand.color,
      text_token: template.appearance.brand.textToken,
      border_token: template.appearance.brand.borderToken,
      font_family: template.appearance.typography.fontFamily,
      body_size_pt: template.appearance.typography.bodySizePt,
      heading_size_pt: template.appearance.typography.headingSizePt,
      page_size: template.appearance.page.size,
      margins: template.appearance.page.margins,
      density: template.appearance.page.density,
    },
  };
}

export function TemplateStudioScreen({
  companyId,
  company,
  lang = "en",
}: TemplateStudioScreenProps) {
  const entitlements = useEntitlements();
  const templates = useTemplates(companyId);
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const publish = usePublishTemplate();

  const [editing, setEditing] = useState<InvoiceTemplate | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const included = hasFeature(entitlements.data?.features, "pdf_templates_premium");

  if (entitlements.isLoading || templates.isLoading) return <LoadingScreen />;

  //  Editing an existing template: skip the model gallery, it already has a
  //  shape and re-picking a preset would silently discard it.
  if (editing) {
    return (
      <TemplateWorkspace
        template={editing}
        company={company ?? { name: "Your company" }}
        lang={lang}
        skipGallery={Boolean(editingId)}
        saving={update.isPending || create.isPending || publish.isPending}
        onChange={setEditing}
        onSave={() => {
          if (editingId) update.mutate({ id: editingId, body: fromStudio(editing) });
          else if (companyId)
            //  `name` is optional on the update shape and required on create,
            //  so it is restated rather than spread — the two requests are not
            //  the same type and pretending otherwise only moves the error.
            create.mutate(
              {
                company_id: companyId,
                ...fromStudio(editing),
                name: editing.name,
              },
              { onSuccess: (row) => setEditingId(row.id) },
            );
        }}
        onPublish={() => {
          if (editingId) publish.mutate(editingId);
        }}
        onExit={() => {
          setEditing(null);
          setEditingId(null);
        }}
      />
    );
  }

  const rows = templates.data ?? [];

  return (
    <>
      <PageHeader
        title="Invoice templates"
        subtitle={
          included
            ? "Design the document your customers receive."
            : "Available on Business and above."
        }
        actions={
          included ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditingId(null);
                setEditing(defaultTemplate());
              }}
            >
              New template
            </Button>
          ) : undefined
        }
      />

      {!included && (
        <Banner tone="info">
          The visual designer is part of Business. Templates you already created
          stay here and keep printing — every invoice you have issued carries its
          own copy of the layout, so nothing you have sent changes.
        </Banner>
      )}

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            title="No templates yet"
            description={
              included
                ? "Start from one of five models and change anything."
                : "Upgrade to Business to design your own."
            }
          />
        ) : (
          <List
            items={rows.map((row) => ({
              key: row.id,
              primary: row.name,
              secondary:
                row.published_version === null
                  ? "Never published — not yet used on a document"
                  : `Published v${row.published_version}`,
              trailing: row.is_default ? <Badge tone="success">default</Badge> : undefined,
              onClick: included
                ? () => {
                    setEditingId(row.id);
                    setEditing(toStudio(row));
                  }
                : undefined,
            }))}
          />
        )}
      </Card>
    </>
  );
}
