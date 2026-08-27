/** Catalog — products & services.
 *
 *  PATCH /products/{id} has existed since the product service landed and no
 *  screen ever called it: the catalog was create-and-forget. The record drawer
 *  below is that missing half.
 *
 *  The status and billing-type filters are SERVER filters. They were left out
 *  entirely while GET /products took no parameters, because a control that
 *  filters one fetched page is a control that lies about where the work
 *  happens — it keeps working right up to the day the catalog outgrows a
 *  single response, and then quietly stops finding things. `?status` and
 *  `?billing_type` shipped with B3, so the filter is real: changing one
 *  re-queries, and the row count below is the server's answer, not a slice.
 */

import { useMemo, useState, type FormEvent } from "react";

import {
  Badge,
  Banner,
  Button,
  Card,
  DataList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Table,
  TextInput,
  Textarea,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";

import { useCreateProduct, useProducts, useUpdateProduct } from "../hooks/queries";
import { formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";
import type { ProductResponse } from "../types";

const PAGE_SIZE = 25;

/** core/models/product.py — sent verbatim, so these are contracts not labels. */
const BILLING_TYPES = ["fixed", "hourly", "daily", "unit", "recurring"] as const;
const PRODUCT_STATUSES = ["active", "archived", "draft"] as const;

export interface ProductsPanelProps {
  companyId: string;
  lang?: Lang;
  /** Preselect the status filter — `catalog/archived` is this screen with
   *  `status="archived"`, not a second list. The control stays visible and
   *  usable; this only says where it starts. */
  status?: string;
  /** Same, for billing type. */
  billingType?: string;
}

interface ProductDraft {
  name: string;
  description: string;
  category: string;
  unitPrice: string;
  billingType: string;
  status: string;
  vatRate: string;
}

const BLANK: ProductDraft = {
  name: "",
  description: "",
  category: "",
  unitPrice: "",
  billingType: "fixed",
  status: "active",
  vatRate: "21",
};

function draftOf(product: ProductResponse): ProductDraft {
  return {
    name: product.name,
    description: product.description ?? "",
    category: product.category ?? "",
    unitPrice: String(product.unit_price),
    billingType: product.billing_type,
    status: product.status,
    vatRate: String(product.default_vat_rate),
  };
}

export function ProductsPanel({
  companyId,
  lang = "en",
  status: initialStatus,
  billingType: initialBillingType,
}: ProductsPanelProps) {
  const [status, setStatus] = useState(initialStatus ?? "");
  const [billingType, setBillingType] = useState(initialBillingType ?? "");
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useProducts({
    companyId,
    status: status || undefined,
    billingType: billingType || undefined,
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [sort, setSort] = useState<TableSort>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ProductDraft>(BLANK);

  // The drawer is addressed by id rather than holding the row object, so it
  // re-reads from the refreshed list after a save instead of showing the copy
  // that was clicked.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<ProductDraft>(BLANK);
  const [saved, setSaved] = useState(false);

  const selected = products?.find((product) => product.id === selectedId);

  const sorted = useMemo(() => {
    const rows = [...(products ?? [])];
    const direction = sort.direction === "asc" ? 1 : -1;
    const pick = (row: ProductResponse) => {
      switch (sort.key) {
        case "category":
          return row.category ?? "";
        case "unit_price":
          return Number(row.unit_price);
        case "status":
          return row.status;
        default:
          return row.name;
      }
    };
    rows.sort((a, b) => {
      const left = pick(a);
      const right = pick(b);
      if (left === right) return 0;
      return (left < right ? -1 : 1) * direction;
    });
    return rows;
  }, [products, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openRecord = (product: ProductResponse) => {
    setSelectedId(product.id);
    setEditing(false);
    setSaved(false);
    setEditDraft(draftOf(product));
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    createProduct.mutate(
      {
        company_id: companyId,
        name: createDraft.name,
        description: createDraft.description || null,
        category: createDraft.category || null,
        unit_price: createDraft.unitPrice,
        billing_type: createDraft.billingType,
        status: createDraft.status,
        default_vat_rate: createDraft.vatRate,
      },
      {
        onSuccess: () => {
          setCreateDraft(BLANK);
          setCreateOpen(false);
        },
      },
    );
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    updateProduct.mutate(
      {
        productId: selected.id,
        body: {
          name: editDraft.name,
          description: editDraft.description || null,
          category: editDraft.category || null,
          unit_price: editDraft.unitPrice,
          billing_type: editDraft.billingType,
          status: editDraft.status,
          default_vat_rate: editDraft.vatRate,
        },
      },
      {
        onSuccess: () => {
          setEditing(false);
          setSaved(true);
        },
      },
    );
  };

  const columns: TableColumn<ProductResponse>[] = [
    { key: "name", label: t(lang, "products.name"), sortable: true },
    {
      key: "category",
      label: t(lang, "products.category"),
      sortable: true,
      render: (row) => row.category ?? "—",
    },
    {
      key: "billing_type",
      label: t(lang, "products.billingType"),
      render: (row) => <Badge tone="info">{row.billing_type}</Badge>,
    },
    {
      key: "unit_price",
      label: t(lang, "products.price"),
      numeric: true,
      sortable: true,
      render: (row) => formatMoney(row.unit_price, row.currency, lang),
    },
    {
      key: "default_vat_rate",
      label: t(lang, "products.vatRate"),
      numeric: true,
      render: (row) => <span className="bg-num">{row.default_vat_rate}</span>,
    },
    {
      key: "status",
      label: t(lang, "products.status"),
      sortable: true,
      render: (row) => (
        <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge>
      ),
    },
  ];

  if (isError) {
    return (
      <Card>
        <ErrorState
          title={t(lang, "common.error")}
          onRetry={() => void refetch()}
          retryLabel={t(lang, "common.retry")}
        />
      </Card>
    );
  }

  return (
    <section className="bg-stack" aria-label={t(lang, "products.title")}>
      <PageHeader
        title={t(lang, "products.title")}
        actions={
          <Button onClick={() => setCreateOpen(true)}>{t(lang, "products.add")}</Button>
        }
      />

      <Card>
        <div className="bg-companyform__grid">
          <Field label={t(lang, "products.status")}>
            <Select
              value={status}
              options={[
                { value: "", label: t(lang, "products.anyStatus") },
                ...PRODUCT_STATUSES.map((value) => ({ value, label: value })),
              ]}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label={t(lang, "products.billingType")}>
            <Select
              value={billingType}
              options={[
                { value: "", label: t(lang, "products.anyBillingType") },
                ...BILLING_TYPES.map((value) => ({ value, label: value })),
              ]}
              onChange={(event) => {
                setBillingType(event.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>
        {status || billingType ? (
          <p className="bg-companyform__note">{t(lang, "products.filtered")}</p>
        ) : null}
      </Card>

      <Card padded={false}>
        {isLoading ? (
          <div className="bg-report__skeleton">
            <Skeleton lines={6} />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              rows={visible}
              rowKey={(row) => row.id}
              sort={sort}
              onSortChange={(next) => {
                setSort(next);
                setPage(1);
              }}
              onRowClick={openRecord}
              empty={<EmptyState title={t(lang, "products.empty")} />}
            />
            {pageCount > 1 ? (
              <div className="bg-report__pagination">
                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </Card>

      {/* Record inspector — the same pattern the invoice list uses, for the
          same reason: a row that ends in an Edit button per column is five
          equal-weight controls and no readable data. */}
      <Drawer
        open={selected !== undefined}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ""}
        size="md"
        footer={
          selected ? (
            editing ? (
              <>
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  {t(lang, "common.cancel")}
                </Button>
                <Button
                  type="submit"
                  form="product-edit"
                  disabled={updateProduct.isPending}
                >
                  {t(lang, "common.save")}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>{t(lang, "products.edit")}</Button>
            )
          ) : null
        }
      >
        {selected ? (
          editing ? (
            <form id="product-edit" onSubmit={submitEdit}>
              <ProductFields
                draft={editDraft}
                onChange={setEditDraft}
                lang={lang}
              />
              {updateProduct.isError ? (
                <Banner tone="danger">{t(lang, "common.error")}</Banner>
              ) : null}
            </form>
          ) : (
            <>
              {saved ? (
                <Banner tone="success" onDismiss={() => setSaved(false)}>
                  {t(lang, "products.saved")}
                </Banner>
              ) : null}
              <DataList
                rows={[
                  { key: "name", label: t(lang, "products.name"), value: selected.name },
                  {
                    key: "description",
                    label: t(lang, "products.description"),
                    value: selected.description,
                  },
                  {
                    key: "category",
                    label: t(lang, "products.category"),
                    value: selected.category,
                  },
                  {
                    key: "billing_type",
                    label: t(lang, "products.billingType"),
                    value: <Badge tone="info">{selected.billing_type}</Badge>,
                  },
                  {
                    key: "unit_price",
                    label: t(lang, "products.price"),
                    mono: true,
                    value: formatMoney(selected.unit_price, selected.currency, lang),
                  },
                  {
                    key: "vat",
                    label: t(lang, "products.vatRate"),
                    mono: true,
                    value: String(selected.default_vat_rate),
                  },
                  {
                    key: "status",
                    label: t(lang, "products.status"),
                    value: (
                      <Badge tone={selected.status === "active" ? "success" : "neutral"}>
                        {selected.status}
                      </Badge>
                    ),
                  },
                ]}
              />
            </>
          )
        ) : null}
      </Drawer>

      <Modal
        open={createOpen}
        title={t(lang, "products.add")}
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={submitCreate}>
          <ProductFields draft={createDraft} onChange={setCreateDraft} lang={lang} />
          {createProduct.isError ? (
            <Banner tone="danger">{t(lang, "common.error")}</Banner>
          ) : null}
          <div className="bg-panel__actions">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {t(lang, "common.cancel")}
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {t(lang, "common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

/** One field set, two call sites (create and edit) — the API takes the same
 *  columns either way, so two divergent forms would only be a source of drift. */
function ProductFields({
  draft,
  onChange,
  lang,
}: {
  draft: ProductDraft;
  onChange: (draft: ProductDraft) => void;
  lang: Lang;
}) {
  const set = (patch: Partial<ProductDraft>) => onChange({ ...draft, ...patch });
  return (
    <>
      <Field label={t(lang, "products.name")} required>
        <TextInput
          value={draft.name}
          required
          onChange={(event) => set({ name: event.target.value })}
        />
      </Field>
      <Field label={t(lang, "products.description")}>
        <Textarea
          value={draft.description}
          onChange={(event) => set({ description: event.target.value })}
        />
      </Field>
      <Field label={t(lang, "products.price")} required>
        <TextInput
          value={draft.unitPrice}
          required
          inputMode="decimal"
          onChange={(event) => set({ unitPrice: event.target.value })}
        />
      </Field>
      <Field label={t(lang, "products.category")}>
        <TextInput
          value={draft.category}
          onChange={(event) => set({ category: event.target.value })}
        />
      </Field>
      <Field label={t(lang, "products.billingType")}>
        <Select
          value={draft.billingType}
          options={BILLING_TYPES.map((value) => ({ value, label: value }))}
          onChange={(event) => set({ billingType: event.target.value })}
        />
      </Field>
      <Field label={t(lang, "products.status")}>
        <Select
          value={draft.status}
          options={PRODUCT_STATUSES.map((value) => ({ value, label: value }))}
          onChange={(event) => set({ status: event.target.value })}
        />
      </Field>
      <Field label={t(lang, "products.vatRate")}>
        <TextInput
          value={draft.vatRate}
          inputMode="decimal"
          onChange={(event) => set({ vatRate: event.target.value })}
        />
      </Field>
    </>
  );
}
