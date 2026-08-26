/** Clients — list + create. The reference implementation of the panel pattern:
 *  server state via hooks, zero business logic, translations via t().
 *
 *  No search box. GET /clients takes company_id and nothing else, so a search
 *  field here could only filter an already-downloaded page — a control that
 *  works until the list outgrows one response and then quietly stops finding
 *  things. It belongs to a server-side query parameter that does not exist.
 */

import { useMemo, useState, type FormEvent } from "react";

import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Skeleton,
  Table,
  TextInput,
  type TableColumn,
  type TableSort,
} from "@henrioutai/ui";

import { useClients, useCreateClient } from "../hooks/queries";
import { t, type Lang } from "../lib/translations";
import type { ClientResponse } from "../types";

const PAGE_SIZE = 25;

export interface ClientsPanelProps {
  companyId: string;
  lang?: Lang;
  /** Open one client's 360 screen. Rows are inert without it. */
  onOpenClient?: (clientId: string) => void;
}

export function ClientsPanel({ companyId, lang = "en", onOpenClient }: ClientsPanelProps) {
  const { data: clients, isLoading, isError, refetch } = useClients(companyId);
  const createClient = useCreateClient();

  const [sort, setSort] = useState<TableSort>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("BE");

  const resetForm = () => {
    setName("");
    setEmail("");
    setVatNumber("");
    setAddressLine1("");
    setPostalCode("");
    setCity("");
    setCountryCode("BE");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createClient.mutate(
      {
        company_id: companyId,
        name,
        email: email || null,
        vat_number: vatNumber || null,
        address_line1: addressLine1 || null,
        postal_code: postalCode || null,
        city: city || null,
        country_code: countryCode.toUpperCase() || "BE",
      },
      {
        onSuccess: () => {
          resetForm();
          setFormOpen(false);
        },
      },
    );
  };

  const sorted = useMemo(() => {
    const rows = [...(clients ?? [])];
    const direction = sort.direction === "asc" ? 1 : -1;
    const pick = (row: ClientResponse) => {
      switch (sort.key) {
        case "email":
          return row.email ?? "";
        case "vat_number":
          return row.vat_number ?? "";
        case "city":
          return row.city ?? "";
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
  }, [clients, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: TableColumn<ClientResponse>[] = [
    {
      key: "name",
      label: t(lang, "clients.name"),
      sortable: true,
      render: (client) =>
        onOpenClient ? (
          <button
            type="button"
            className="bg-linkish"
            onClick={(event) => {
              // The row handles the click; the button exists so the destination
              // is reachable by keyboard, not by mouse only.
              event.stopPropagation();
              onOpenClient(client.id);
            }}
          >
            {client.name}
          </button>
        ) : (
          client.name
        ),
    },
    {
      key: "type",
      label: t(lang, "client360.type"),
      render: (client) => (
        <Badge tone={client.is_business ? "info" : "neutral"}>
          {client.is_business
            ? t(lang, "client360.business")
            : t(lang, "client360.individual")}
        </Badge>
      ),
    },
    {
      key: "email",
      label: t(lang, "clients.email"),
      sortable: true,
      render: (client) => client.email ?? "—",
    },
    {
      key: "vat_number",
      label: t(lang, "clients.vat"),
      sortable: true,
      render: (client) =>
        client.vat_number ? (
          <span className="bg-num">{client.vat_number}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "city",
      label: t(lang, "clients.city"),
      sortable: true,
      render: (client) => client.city ?? "—",
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
    <section className="bg-stack" aria-label={t(lang, "clients.title")}>
      <PageHeader
        title={t(lang, "clients.title")}
        actions={
          <Button onClick={() => setFormOpen(true)}>{t(lang, "clients.add")}</Button>
        }
      />

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
              rowKey={(client) => client.id}
              sort={sort}
              onSortChange={(next) => {
                setSort(next);
                setPage(1);
              }}
              onRowClick={onOpenClient ? (client) => onOpenClient(client.id) : undefined}
              empty={<EmptyState title={t(lang, "clients.empty")} />}
            />
            {pageCount > 1 ? (
              <div className="bg-report__pagination">
                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Modal
        open={formOpen}
        title={t(lang, "clients.add")}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <Field label={t(lang, "clients.name")} required>
            <TextInput
              value={name}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "clients.email")}>
            <TextInput
              value={email}
              type="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "clients.vat")}>
            <TextInput
              value={vatNumber}
              onChange={(event) => setVatNumber(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "clients.address")}>
            <TextInput
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "clients.postalCode")}>
            <TextInput
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "clients.city")}>
            <TextInput
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </Field>
          <Field label={t(lang, "clients.country")}>
            <TextInput
              value={countryCode}
              maxLength={2}
              onChange={(event) => setCountryCode(event.target.value)}
            />
          </Field>
          {createClient.isError ? (
            <Banner tone="danger">{t(lang, "common.error")}</Banner>
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
