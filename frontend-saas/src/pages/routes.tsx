/** Thin route components: read the shell context, mount the corresponding
 *  @billgen/ui panel. */

import {
  ActivityPanel,
  ClientsPanel,
  CompanyForm,
  DashboardPanel,
  HistoryPanel,
  InvoiceBuilderPanel,
  ProductsPanel,
  useCompanies,
} from "@billgen/ui";
import { useNavigate, useOutletContext } from "react-router-dom";

import type { ShellContext } from "./AppShell";

export function DashboardRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  return <DashboardPanel companyId={companyId} lang={lang} />;
}

export function ClientsRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  return <ClientsPanel companyId={companyId} lang={lang} />;
}

export function ProductsRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  return <ProductsPanel companyId={companyId} lang={lang} />;
}

export function InvoiceBuilderRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  return (
    <InvoiceBuilderPanel
      companyId={companyId}
      lang={lang}
      onCreated={() => navigate("/app/invoices")}
    />
  );
}

export function HistoryRoute() {
  const { companyId, lang } = useOutletContext<ShellContext>();
  return <HistoryPanel companyId={companyId} lang={lang} />;
}

export function ActivityRoute() {
  const { lang } = useOutletContext<ShellContext>();
  return <ActivityPanel lang={lang} />;
}

export function SettingsRoute() {
  const { lang } = useOutletContext<ShellContext>();
  const { data: companies } = useCompanies();
  return (
    <div>
      {companies && companies.length > 0 ? (
        <section className="bg-panel">
          <h1 className="text-lg font-semibold mb-3">Companies</h1>
          <ul className="list-disc pl-5 text-sm">
            {companies.map((company) => (
              <li key={company.id}>
                {company.name}
                {company.vat_number ? ` — ${company.vat_number}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <CompanyForm lang={lang} />
    </div>
  );
}
