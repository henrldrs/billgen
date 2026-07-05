/** Clients — list + create. The reference implementation of the panel pattern:
 *  server state via hooks, zero business logic, translations via t(). */

import { useState, type FormEvent } from "react";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { Modal } from "../components/Modal";
import { Spinner } from "../components/Spinner";
import { useClients, useCreateClient } from "../hooks/queries";
import { t, type Lang } from "../lib/translations";

export interface ClientsPanelProps {
  companyId: string;
  lang?: Lang;
}

export function ClientsPanel({ companyId, lang = "en" }: ClientsPanelProps) {
  const { data: clients, isLoading, isError } = useClients(companyId);
  const createClient = useCreateClient();

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [city, setCity] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setVatNumber("");
    setCity("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createClient.mutate(
      {
        company_id: companyId,
        name,
        email: email || null,
        vat_number: vatNumber || null,
        city: city || null,
      },
      {
        onSuccess: () => {
          resetForm();
          setFormOpen(false);
        },
      },
    );
  };

  if (isLoading) return <Spinner label={t(lang, "common.loading")} />;
  if (isError) return <div role="alert">{t(lang, "common.error")}</div>;

  return (
    <section className="bg-panel" aria-label={t(lang, "clients.title")}>
      <header className="bg-panel__header">
        <h1>{t(lang, "clients.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>{t(lang, "clients.add")}</Button>
      </header>

      {clients && clients.length > 0 ? (
        <table className="bg-table">
          <thead>
            <tr>
              <th>{t(lang, "clients.name")}</th>
              <th>{t(lang, "clients.email")}</th>
              <th>{t(lang, "clients.vat")}</th>
              <th>{t(lang, "clients.city")}</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>{client.email ?? "—"}</td>
                <td>{client.vat_number ?? "—"}</td>
                <td>{client.city ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState message={t(lang, "clients.empty")} />
      )}

      <Modal
        open={formOpen}
        title={t(lang, "clients.add")}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <Field
            label={t(lang, "clients.name")}
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
          />
          <Field
            label={t(lang, "clients.email")}
            value={email}
            type="email"
            onChange={(event) => setEmail(event.target.value)}
          />
          <Field
            label={t(lang, "clients.vat")}
            value={vatNumber}
            onChange={(event) => setVatNumber(event.target.value)}
          />
          <Field
            label={t(lang, "clients.city")}
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          {createClient.isError ? (
            <div role="alert">{t(lang, "common.error")}</div>
          ) : null}
          <div className="bg-panel__actions">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t(lang, "common.cancel")}
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {t(lang, "common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
