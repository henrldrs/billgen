/** Template gallery (§13) — cards, the default badge, per-card actions.
 *
 *  Scaffold — see README.md.
 *
 *  A separate route from invoice creation, on purpose. Template design is a
 *  settings-shaped task done rarely and carefully; invoice creation is done
 *  daily and fast. Mixing them puts a "change the font" control next to a
 *  "send this to a customer" control.
 */

import { Badge, Button, Card, EmptyState, Menu, type MenuEntry } from "@henrioutai/ui";

import { formatDate } from "../lib/format";
import type { Lang } from "../lib/translations";
import type { InvoiceTemplate } from "./templateSchema";

export interface TemplateListProps {
  templates: InvoiceTemplate[];
  lang?: Lang;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateInvoice: (id: string) => void;
}

export function TemplateList({
  templates,
  lang = "en",
  onCreate,
  onEdit,
  onPreview,
  onDuplicate,
  onSetDefault,
  onDelete,
  onCreateInvoice,
}: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <EmptyState
        title="No invoice templates yet"
        description="A template decides what your invoices look like. Start from the default and change what you need."
        action={
          <Button variant="primary" onClick={onCreate}>
            Create template
          </Button>
        }
      />
    );
  }

  function entriesFor(template: InvoiceTemplate): MenuEntry[] {
    const entries: MenuEntry[] = [
      { key: "edit", label: "Edit", onSelect: () => onEdit(template.id) },
      { key: "preview", label: "Preview", onSelect: () => onPreview(template.id) },
      { key: "duplicate", label: "Duplicate", onSelect: () => onDuplicate(template.id) },
      { key: "invoice", label: "Create invoice", onSelect: () => onCreateInvoice(template.id) },
    ];
    if (!template.isDefault) {
      entries.push({
        key: "default",
        label: "Set as default",
        onSelect: () => onSetDefault(template.id),
      });
      entries.push({ type: "separator", key: "sep" });
      // Deleting the default would leave new invoices with no template at all,
      // so the action is absent rather than disabled: an option you can never
      // use is worse than one that is not offered.
      entries.push({
        key: "delete",
        label: "Delete",
        danger: true,
        onSelect: () => onDelete(template.id),
      });
    }
    return entries;
  }

  return (
    <div className="bg-ws-templates">
      {templates.map((template) => (
        <Card
          key={template.id}
          title={template.name}
          subtitle={`v${template.publishedVersion} · edited ${formatDate(
            template.updatedAt.slice(0, 10),
            lang,
          )}`}
          actions={
            <>
              {template.isDefault && <Badge tone="success">Default</Badge>}
              <Menu
                trigger="⋯"
                triggerAriaLabel="Template actions"
                items={entriesFor(template)}
                align="end"
              />
            </>
          }
        >
          <button
            type="button"
            className="bg-ws-template-thumb"
            onClick={() => onPreview(template.id)}
            aria-label={`Preview ${template.name}`}
          >
            <span className="bg-ws-template-thumb__page" />
          </button>
        </Card>
      ))}

      <Card>
        <button type="button" className="bg-ws-template-new" onClick={onCreate}>
          + Create template
        </button>
      </Card>
    </div>
  );
}
