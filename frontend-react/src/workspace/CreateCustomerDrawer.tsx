/** The inline "new customer" drawer (§3).
 *
 *  Scaffold — see README.md. `onSubmit` is the app's; this drawer owns the
 *  form and nothing else.
 *
 *  It is a drawer rather than a route on purpose: the user is mid-invoice, and
 *  navigating away from a draft to create a client is how the draft gets lost.
 *  On save the new customer is selected into the invoice immediately — the
 *  blueprint's own requirement, and the reason the callback returns the
 *  customer rather than just closing.
 *
 *  The VAT field shows a *format* verdict only. Real validation is
 *  `core/rules/identifiers.py` (modulo 97) plus the company-validation
 *  endpoint, and a green tick here that the server later contradicts is worse
 *  than no tick.
 */

import { useState } from "react";
import { Button, Drawer, Field, RadioGroup, Select, TextInput } from "@henrioutai/ui";

import type { DraftCustomer } from "./types";

export interface CreateCustomerDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Persisting is the caller's job — it owns the mutation and the toast. */
  onSubmit: (customer: DraftCustomer) => void;
  saving?: boolean;
}

const TERMS_OPTIONS = [
  { value: "0", label: "On receipt" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
];

/** Shape only. See the note above about what this deliberately does not do. */
function vatLooksWellFormed(value: string): boolean {
  return /^[A-Z]{2}[\s.]?[0-9][0-9\s.]{7,12}$/i.test(value.trim());
}

export function CreateCustomerDrawer({
  open,
  onClose,
  onSubmit,
  saving = false,
}: CreateCustomerDrawerProps) {
  const [isBusiness, setIsBusiness] = useState(true);
  const [name, setName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [termsDays, setTermsDays] = useState("30");

  const vatHint = !vatNumber
    ? undefined
    : vatLooksWellFormed(vatNumber)
      ? "Format looks right — BillGen verifies it on save."
      : "That does not look like a VAT number.";

  const canSave = name.trim().length > 0 && !saving;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New customer"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSave}
            onClick={() =>
              onSubmit({
                id: null,
                name: name.trim(),
                vatNumber: vatNumber.trim() || undefined,
                email: email.trim() || undefined,
                addressLine: addressLine.trim() || undefined,
                postalCode: postalCode.trim() || undefined,
                city: city.trim() || undefined,
                isBusiness,
                paymentTermsDays: Number(termsDays),
              })
            }
          >
            {saving ? "Saving…" : "Save client"}
          </Button>
        </>
      }
    >
      <div className="bg-stack">
        <RadioGroup
          name="customer-type"
          direction="row"
          value={isBusiness ? "company" : "individual"}
          onChange={(value) => setIsBusiness(value === "company")}
          options={[
            { value: "company", label: "Company" },
            { value: "individual", label: "Individual" },
          ]}
        />

        <Field label={isBusiness ? "Company name" : "Name"} htmlFor="cust-name" required>
          <TextInput
            id="cust-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        {isBusiness && (
          <Field label="VAT number" htmlFor="cust-vat" hint={vatHint}>
            <TextInput
              id="cust-vat"
              value={vatNumber}
              placeholder="BE 0123.456.749"
              onChange={(event) => setVatNumber(event.target.value)}
            />
          </Field>
        )}

        <Field label="Email" htmlFor="cust-email">
          <TextInput
            id="cust-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Billing address" htmlFor="cust-address">
          <TextInput
            id="cust-address"
            value={addressLine}
            onChange={(event) => setAddressLine(event.target.value)}
          />
        </Field>

        <div className="bg-ws-row">
          <Field label="Postal code" htmlFor="cust-postal">
            <TextInput
              id="cust-postal"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
          </Field>
          <Field label="City" htmlFor="cust-city">
            <TextInput
              id="cust-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Payment terms" htmlFor="cust-terms">
          <Select
            id="cust-terms"
            options={TERMS_OPTIONS}
            value={termsDays}
            onChange={(event) => setTermsDays(event.target.value)}
          />
        </Field>
      </div>
    </Drawer>
  );
}
