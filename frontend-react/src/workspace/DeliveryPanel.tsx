/** Delivery (§9) — and the distinction the whole panel exists to make.
 *
 *  Scaffold — see README.md.
 *
 *  **Download XML is not Send via Peppol.** BillGen generates and validates
 *  BIS 3.0 UBL, and there it stops: there is no Access Point transmission,
 *  because that is a contract with a reseller and not a piece of code. A
 *  screen that offers "Send via Peppol" over a `GET .../ubl` download is a
 *  screen that tells a user their invoice was delivered when the file went to
 *  their Downloads folder. Nothing here fixes that — the panel's job is to
 *  make the gap visible, so `peppolAvailable` defaults to false and the card
 *  says why.
 *
 *  Email is the same shape of honesty. **B1 — email** is unbuilt, so the card
 *  renders disabled with the reason rather than being hidden: a missing option
 *  reads as a product that cannot do it, a disabled one reads as a product
 *  that will.
 */

import { Badge, Button, Card } from "@henrioutai/ui";

export interface DeliveryPanelProps {
  customerName: string;
  customerEmail?: string;
  /** B1. Until an SMTP provider exists this stays false. */
  emailAvailable?: boolean;
  /** True only when an Access Point is contracted *and* the customer has an
   *  endpoint. Validated UBL alone is not deliverability. */
  peppolAvailable?: boolean;
  /** Set when the customer has a discoverable Peppol endpoint. */
  customerEndpoint?: string;
  onSendEmail: () => void;
  onSendPeppol: () => void;
  onDownloadPdf: () => void;
  onDownloadXml: () => void;
}

export function DeliveryPanel({
  customerName,
  customerEmail,
  emailAvailable = false,
  peppolAvailable = false,
  customerEndpoint,
  onSendEmail,
  onSendPeppol,
  onDownloadPdf,
  onDownloadXml,
}: DeliveryPanelProps) {
  return (
    <div className="bg-ws-delivery">
      <h2>How would you like to deliver it?</h2>

      <Card
        title="Email"
        subtitle={`Send the PDF to ${customerName}`}
        actions={emailAvailable ? undefined : <Badge tone="neutral">Not yet available</Badge>}
      >
        <p className="bg-num">{customerEmail ?? "No email address on this customer"}</p>
        {!emailAvailable && (
          <p className="bg-ws-note">
            BillGen has no mail provider configured yet, so nothing can be sent from here.
          </p>
        )}
        <Button
          variant="primary"
          disabled={!emailAvailable || !customerEmail}
          onClick={onSendEmail}
        >
          Send email
        </Button>
      </Card>

      <Card
        title="Peppol"
        subtitle="Structured electronic invoice"
        actions={peppolAvailable ? undefined : <Badge tone="neutral">No Access Point</Badge>}
      >
        <p>
          {customerEndpoint
            ? `Customer endpoint: ${customerEndpoint}`
            : "No Peppol endpoint known for this customer."}
        </p>
        {!peppolAvailable && (
          <p className="bg-ws-note">
            BillGen generates and validates the UBL, but transmission needs an Access Point
            contract. Downloading the XML below does not deliver the invoice.
          </p>
        )}
        <Button variant="primary" disabled={!peppolAvailable} onClick={onSendPeppol}>
          Send via Peppol
        </Button>
      </Card>

      <Card title="Export" subtitle="PDF · UBL XML">
        <div className="bg-ws-actions">
          <Button variant="secondary" onClick={onDownloadPdf}>
            Download PDF
          </Button>
          <Button variant="secondary" onClick={onDownloadXml}>
            Download XML
          </Button>
        </div>
        <p className="bg-ws-note">
          A downloaded file is a copy for your records. It is not a delivery.
        </p>
      </Card>
    </div>
  );
}
