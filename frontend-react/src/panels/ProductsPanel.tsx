import { useState, type FormEvent } from "react";

import { Button, EmptyState, Field, Modal, Spinner, TextInput } from "@henrioutai/ui";
import { useCreateProduct, useProducts } from "../hooks/queries";
import { formatMoney } from "../lib/format";
import { t, type Lang } from "../lib/translations";

export interface ProductsPanelProps {
  companyId: string;
  lang?: Lang;
}

export function ProductsPanel({ companyId, lang = "en" }: ProductsPanelProps) {
  const { data: products, isLoading, isError } = useProducts(companyId);
  const createProduct = useCreateProduct();

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [category, setCategory] = useState("");
  const [vatRate, setVatRate] = useState("21");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createProduct.mutate(
      {
        company_id: companyId,
        name,
        unit_price: unitPrice,
        category: category || null,
        default_vat_rate: vatRate,
      },
      {
        onSuccess: () => {
          setName("");
          setUnitPrice("");
          setCategory("");
          setVatRate("21");
          setFormOpen(false);
        },
      },
    );
  };

  if (isLoading) return <Spinner label={t(lang, "common.loading")} />;
  if (isError) return <div role="alert">{t(lang, "common.error")}</div>;

  return (
    <section className="bg-panel" aria-label={t(lang, "products.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "products.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>{t(lang, "products.add")}</Button>
      </header>

      {products && products.length > 0 ? (
        <table className="bg-table">
          <thead>
            <tr>
              <th>{t(lang, "products.name")}</th>
              <th>{t(lang, "products.category")}</th>
              <th>{t(lang, "products.price")}</th>
              <th>{t(lang, "products.vatRate")}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.category ?? "—"}</td>
                <td>{formatMoney(product.unit_price, product.currency, lang)}</td>
                <td>{product.default_vat_rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState title={t(lang, "products.empty")} />
      )}

      <Modal
        open={formOpen}
        title={t(lang, "products.add")}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <Field label={t(lang, "products.name")} required>
            <TextInput
              value={name}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "products.price")} required>
            <TextInput
              value={unitPrice}
              required
              inputMode="decimal"
              onChange={(event) => setUnitPrice(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "products.category")}>
            <TextInput
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "products.vatRate")}>
            <TextInput
              value={vatRate}
              inputMode="decimal"
              onChange={(event) => setVatRate(event.target.value)}
            />
          </Field>
          {createProduct.isError ? (
            <div role="alert">{t(lang, "common.error")}</div>
          ) : null}
          <div className="bg-panel__actions">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
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
