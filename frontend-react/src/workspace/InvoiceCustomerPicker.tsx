/** Customer selection (§2), with its six states kept apart.
 *
 *  Scaffold — see README.md. Takes its clients as a prop; wiring it to
 *  `useClients()` is an integration step.
 *
 *  The states the blueprint lists — empty, searching, selected, no results,
 *  create, validation warning — are not decorative. "Searching" and "no
 *  results" being the same screen is the specific bug where a slow list looks
 *  like an empty database, so `loading` and an empty `options` array render
 *  differently here and always will.
 */

import { useState } from "react";
import { Badge, Button, Combobox, Skeleton, type ComboboxOption } from "@henrioutai/ui";

import type { DraftCustomer } from "./types";

export interface CustomerOption {
  id: string;
  name: string;
  vatNumber?: string;
  city?: string;
  isBusiness: boolean;
}

export interface InvoiceCustomerPickerProps {
  customers: CustomerOption[];
  loading?: boolean;
  selected: DraftCustomer | null;
  onSelect: (customer: DraftCustomer | null) => void;
  onCreateRequested: () => void;
}

function toDraftCustomer(option: CustomerOption): DraftCustomer {
  return {
    id: option.id,
    name: option.name,
    vatNumber: option.vatNumber,
    city: option.city,
    isBusiness: option.isBusiness,
  };
}

export function InvoiceCustomerPicker({
  customers,
  loading = false,
  selected,
  onSelect,
  onCreateRequested,
}: InvoiceCustomerPickerProps) {
  const [query, setQuery] = useState<string | null>(null);

  if (selected) {
    const missingVat = selected.isBusiness && !selected.vatNumber;
    return (
      <div className="bg-ws-customer bg-ws-customer--selected">
        <div className="bg-ws-customer__head">
          <strong>{selected.name}</strong>
          <Button variant="link" size="sm" onClick={() => onSelect(null)}>
            Change
          </Button>
        </div>
        <dl className="bg-ws-customer__facts">
          {selected.vatNumber && (
            <div>
              <dt>VAT</dt>
              <dd className="bg-num">{selected.vatNumber}</dd>
            </div>
          )}
          {selected.addressLine && (
            <div>
              <dt>Address</dt>
              <dd>
                {selected.addressLine}
                {selected.postalCode || selected.city ? (
                  <>
                    <br />
                    {[selected.postalCode, selected.city].filter(Boolean).join(" ")}
                  </>
                ) : null}
              </dd>
            </div>
          )}
        </dl>
        {missingVat && (
          <Badge tone="warn">No VAT number — reverse charge and Peppol unavailable</Badge>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-ws-customer">
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  const options: ComboboxOption[] = customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
    hint: [customer.vatNumber, customer.city].filter(Boolean).join(" · "),
  }));

  return (
    <div className="bg-ws-customer">
      <Combobox
        options={options}
        value={query}
        onChange={(value) => {
          setQuery(value);
          const match = customers.find((customer) => customer.id === value);
          onSelect(match ? toDraftCustomer(match) : null);
        }}
        placeholder="Search clients…"
        emptyText="No client matches that name."
      />
      <Button variant="secondary" size="sm" onClick={onCreateRequested}>
        + Create new customer
      </Button>
    </div>
  );
}
