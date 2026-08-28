Based on the architecture audit, I would not treat this as only an invoice form. The missing frontend should be built as a complete Invoice Workspace + Template Studio, while also closing the surrounding UI gaps that the audit identifies.

The architecture already gives you a strong foundation: the SaaS frontend is React 19/Vite, the shared library has 74 exports, the invoice builder already has Combobox, DatePicker, Textarea, Select, and the backend exposes VAT rates and PDF templates.

The important constraint is to use @henrioutai/ui and the canonical BillGen tokens, not recreate the Studio AI reference's components or palette. The reference is explicitly only a layout/component-pattern reference.

What I would ask the coding agent to build
1. Invoice Workspace

Route:

/sales/invoices/new

Full-screen workspace, not modal.

┌────────────────────────────────────────────────────────────────────────────┐
│ ← Invoices     New invoice · Draft                    Save   Preview   ⋯  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ① CUSTOMER        ② ITEMS          ③ DETAILS        ④ REVIEW            │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━○  │
│                                                                            │
├──────────────────────────────┬─────────────────────────────────────────────┤
│                              │                                             │
│  INVOICE                     │             LIVE DOCUMENT                   │
│                              │                                             │
│  Customer                    │       ┌─────────────────────────────┐       │
│  ┌────────────────────────┐  │       │                             │       │
│  │ Acme SRL            ↓  │  │       │       BILLGEN               │       │
│  └────────────────────────┘  │       │                             │       │
│                              │       │       INVOICE                │       │
│  Invoice information         │       │                             │       │
│                              │       │  Acme SRL                    │       │
│  Invoice no.   INV-2026-042  │       │  Rue Example 12              │       │
│  Issue date    26 Aug 2026   │       │                             │       │
│  Due date      25 Sep 2026   │       │  Website development         │       │
│                              │       │  1 × €1,000.00               │       │
│  ITEMS                       │       │                             │       │
│                              │       │              Subtotal €1,000  │       │
│  Website development         │       │              VAT      €210     │       │
│  1 × €1,000       21%   ⋯    │       │              TOTAL    €1,210   │       │
│                              │       │                             │       │
│  + Add item                  │       └─────────────────────────────┘       │
│                              │                                             │
│  Payment                     │                                             │
│  Terms: 30 days              │                                             │
│  IBAN: BE••••                │                                             │
│                              │                                             │
│  Notes                       │                                             │
│  [Optional note...]          │                                             │
│                              │                                             │
└──────────────────────────────┴─────────────────────────────────────────────┘

The preview should be real, not a decorative mock.

2. Customer selection UI

Build:

InvoiceCustomerPicker

States:

empty
searching
existing customer selected
no results
create customer
customer validation warning
Customer
──────────────────────────────

[ 🔎 Search clients... ]

Recent
──────────────────────────────
Acme SRL
VAT BE0123...
Brussels

Maison Dupont
VAT BE0456...
Antwerp

──────────────────────────────
+ Create new customer

Selecting a client expands:

✓ Acme SRL

BE0123.456.789
Rue Example 12
1000 Brussels
Belgium

[Change]

And Create new customer opens the inline drawer described in your concept.

This is especially appropriate because the architecture explicitly identifies Combobox as the intended client picker for the invoice builder.

3. New customer drawer

Build:

CreateCustomerDrawer

┌──────────────────────────────────────┐
│ New customer                     ×   │
├──────────────────────────────────────┤
│                                      │
│ Customer type                        │
│ ○ Company   ○ Individual             │
│                                      │
│ Company name                         │
│ [________________________________]   │
│                                      │
│ VAT number                           │
│ [BE______________________________]   │
│ ✓ Valid Belgian VAT number           │
│                                      │
│ Email                                │
│ [________________________________]   │
│                                      │
│ Billing address                      │
│ [________________________________]   │
│ [________] [____________________]    │
│                                      │
│ Payment terms                        │
│ [30 days                         ↓]  │
│                                      │
├──────────────────────────────────────┤
│ Cancel                  Save client  │
└──────────────────────────────────────┘

After saving:

customer automatically becomes selected in the invoice.

4. Intelligent line-item editor

This should become one of BillGen's signature pieces.

InvoiceItemsEditor
Items

┌────────────────────────────────────────────────────────────────┐
│ Description                 Qty       Unit price        VAT     │
├────────────────────────────────────────────────────────────────┤
│ Website development          1        €1,000.00        21% ⋯  │
│                                                                  │
│ Maintenance                  2          €250.00        21% ⋯  │
└────────────────────────────────────────────────────────────────┘

+ Add item
+ Add from catalog

Typing into description:

[ Web ]

Suggestions
────────────────────
Website development       €1,000
Website maintenance         €250
Web hosting                  €35

Use Combobox.

Use catalog information when selected, but permit overrides.

5. Item editing drawer

Clicking an item should open:

Edit line item

Description
[ Website development ]

Quantity
[ 1 ]

Unit
[ hour ↓ ]

Unit price
[ €1,000.00 ]

VAT
[ 21% ↓ ]

Discount
[ None ↓ ]

────────────────────

Subtotal
€1,000.00

[Remove item]

This keeps the main invoice canvas clean.

6. Invoice details panel

Create:

InvoiceDetailsPanel

Sections:

Document
invoice number
issue date
due date
currency
language
References
purchase order
customer reference
project reference
Delivery
billing address
delivery address
Payment
payment terms
bank account
structured communication / payment reference
Additional
notes
terms & conditions
internal note

Use progressive disclosure so the first screen doesn't become a 50-field form.

7. Live totals

Build a dedicated:

InvoiceTotals

Subtotal                         €1,000.00

Discount                           €0.00

VAT 21%                           €210.00
────────────────────────────────────────
Total                           €1,210.00

For multiple VAT rates:

VAT summary

21%     €1,000.00    €210.00
12%       €200.00     €24.00
6%        €100.00      €6.00
──────────────────────────────
Total VAT                  €240

The backend already has the VAT calculation domain and GET /vat-rates; the UI should consume those rather than maintain another list of VAT constants.

8. Review step

Create:

InvoiceReview

This is the screen between editing and sending.

Review invoice

✓ Customer
  Acme SRL
  BE0123.456.789

✓ Invoice details
  INV-2026-0042
  26 Aug 2026
  Due 25 Sep 2026

✓ Items
  2 items
  €1,200 subtotal

✓ Taxes
  €252 VAT

────────────────────────────

TOTAL
€1,452.00

────────────────────────────

Invoice readiness

✓ Customer information
✓ VAT information
✓ Invoice number
✓ Dates
✓ Line items
✓ VAT
✓ Payment information

[← Edit invoice]       [Preview PDF]
                         [Continue →]

This is where your future validation engine should plug in.

9. Send / export surface

Don't make Send simply fire an API request.

Open a proper delivery panel:

Send invoice

How would you like to deliver it?

┌────────────────────────────────────┐
│ ✉ Email                            │
│ Send PDF to Acme                    │
│                                    │
│ acme@example.com                   │
│                                    │
│ [Customize message]                │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Peppol                             │
│ Structured electronic invoice       │
│                                    │
│ ✓ Customer endpoint available       │
│                                    │
│ [Send via Peppol]                  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Export                             │
│ PDF · UBL XML                      │
│                                    │
│ [Download PDF] [Download XML]      │
└────────────────────────────────────┘

This matters because the architecture currently stops Peppol at XML download: the UBL is generated and validated, but there is no Access Point transmission.

So the UI should clearly distinguish:

Download XML ≠ Send via Peppol.

10. Invoice detail page

The generated invoice needs a much stronger record page.

Route:

/sales/invoices/:id

Use the existing RecordLayout, DataList, Drawer, StatusTimeline, CopyButton patterns that the architecture already established.

← Invoices

INV-2026-0042                         PAID
Acme SRL                              €1,452.00

[Send] [Download PDF] [⋯]

────────────────────────────────────────────────────────

DOCUMENT                         FINANCIALS

Issue date      26 Aug 2026      Subtotal     €1,200
Due date        25 Sep 2026      VAT            €252
Payment terms   30 days          Total        €1,452

────────────────────────────────────────────────────────

Invoice items

Website development      1       €1,000
Maintenance              2         €200

────────────────────────────────────────────────────────

Activity

● Paid                         Today
│
● Sent                         25 Aug
│
● Issued                       25 Aug
│
● Draft created                25 Aug
11. Invoice actions menu

Build the missing action hierarchy:

⋯

Edit invoice
Duplicate
Create credit note
Download PDF
Download UBL
Send
Send via Peppol
Record payment
View activity
Create template from invoice
Void invoice

Don't put eight buttons across the header.

The architecture explicitly identifies the Drawer/action-cluster pattern as the solution to the current action-soup problem.

12. "Create from invoice"

This should be a first-class flow.

Create from invoice

What do you want to create?

○ New invoice
○ Invoice template
○ Recurring invoice
○ Credit note

For New invoice:

copy customer
copy items
copy prices
recalculate dates
generate new number
reset payment status
reset transmission state

The backend already has POST /invoices/{id}/duplicate.

13. Invoice Template Studio

This should be a separate route, not mixed into invoice creation.

/settings/invoice-templates

Invoice templates

Your templates

┌──────────────────┐
│                  │
│  Default         │
│  Invoice         │
│                  │
│  [Preview]       │
└──────────────────┘

┌──────────────────┐
│                  │
│  Modern          │
│  Consulting      │
│                  │
│  [Preview]       │
└──────────────────┘

┌──────────────────┐
│        +         │
│                  │
│ Create template  │
└──────────────────┘
14. Template editor

Route:

/settings/invoice-templates/:id/edit

Three-column workspace:

┌─────────────────────────────────────────────────────────────────────┐
│ ← Templates     Modern Invoice          Save     Preview     ⋯      │
├─────────────────┬────────────────────────────────┬──────────────────┤
│                 │                                │                  │
│ BLOCKS          │         DOCUMENT              │ PROPERTIES       │
│                 │                                │                  │
│ Header          │      ┌──────────────────┐      │ Selected: Header │
│ Customer        │      │      BILLGEN     │      │                  │
│ Invoice info    │      │                  │      │ Layout           │
│ Items           │      │      INVOICE     │      │                  │
│ Totals          │      │                  │      │ Alignment        │
│ Payment         │      │                  │      │                  │
│ Notes           │      │      ITEMS       │      │ Logo             │
│ Footer          │      │                  │      │ [Upload]         │
│                 │      │      TOTAL       │      │                  │
│                 │      └──────────────────┘      │ Typography       │
│                 │                                │                  │
└─────────────────┴────────────────────────────────┴──────────────────┘

But importantly:

No freeform Canva-style positioning.

15. Template blocks

Create these configurable blocks:

Header

TemplateHeader

Properties:

logo
company name
company contact
document title
alignment
spacing
Customer

TemplateParties

seller
customer
addresses
VAT numbers
Invoice metadata

TemplateDocumentMeta

invoice number
issue date
due date
reference
payment terms
Items

TemplateItemsTable

Controls:

columns
column order
visibility
widths
decimal precision
VAT display
discount display
Totals

TemplateTotals

subtotal
discount
VAT
total
amount due
Payment

TemplatePayment

IBAN
BIC
structured reference
payment terms
QR
Notes

TemplateNotes

Terms

TemplateTerms

Footer

TemplateFooter

16. Template block interaction

Click a block:

ITEM TABLE

Visible columns

☑ Description
☑ Quantity
☑ Unit
☑ Unit price
☑ VAT
☑ Total

Drag to reorder

────────────────────

VAT display

○ Percentage
● Percentage + amount
○ Amount only

────────────────────

Spacing
[ Compact ─────●─── ]

[Reset]

This gives users meaningful customization without letting them destroy the document structure.

17. Template theme panel

Create:

TemplateAppearancePanel

Appearance

Brand

Primary
[ ● ]

Text
[ ● ]

Borders
[ ● ]

────────────────────

Typography

Font
[ Satoshi          ↓ ]

Body size
[ 10px ]

Heading size
[ 24px ]

────────────────────

Document

Page
[ A4              ↓ ]

Margins
[ Standard        ↓ ]

Density
○ Compact
● Comfortable
○ Spacious

The controls should map to semantic tokens/configuration, never raw colors in component code. Your brand rules explicitly require semantic tokens and keep emerald #10B981 + Satoshi canonical.

18. Template preview modes

Add:

Preview

[ Desktop ] [ A4 ] [ Mobile ]

And:

[ Sample invoice ↓ ]

with sample data:

company
customer
multiple VAT rates
long description
discount
payment information

This is much better than previewing an empty invoice.

19. Template versioning

Add:

Template
Modern Invoice

Published
v3

Last edited
26 Aug 2026

[Edit]

Versions
────────────────
v3   Current
v2   20 Aug
v1   12 Aug

[Duplicate template]

Crucially, invoices should retain the template/rendering snapshot they were issued with.

Changing a template must not visually rewrite an already-issued historical invoice.

20. Template actions
⋯

Rename
Duplicate
Set as default
Preview
Create invoice
Export template
Delete

And:

Create invoice from template

should jump directly into the invoice workspace with:

template selected
default company information
default payment configuration
predefined line items if the template contains them
21. Missing frontend pieces from the audit

Beyond invoice creation, I'd put these into the same implementation pass.

The audit says the SaaS frontend has 23 wired areas but roughly 20 recently shipped backend capabilities with no screen consuming them. Specifically called out are VAT report, company form, credit notes, payments, plans and usage.

So build:

Company

CompanySettingsPage

company identity
VAT / KBO information
address
contact
logo
validation state
save
unsaved changes
validation errors

The company PATCH and validation endpoints are already shipped.

Credit notes

CreditNotesList

CreditNoteDetail

CreateCreditNote

The list already has its Table and Pagination foundation.

Payments
Payments

Outstanding
€12,450

Received
€32,800

Overdue
€4,200

────────────────────────

Payment list

Then:

RecordPaymentDrawer

Record payment

Invoice
INV-2026-0042

Amount
€1,452.00

Payment date
26 Aug 2026

Method
[ Bank transfer ↓ ]

Reference
[________________]

[Cancel] [Record payment]
VAT report
VAT report

[ Q3 2026 ↓ ]

Sales
€48,200

VAT collected
€10,122

────────────────────

VAT rates
21%    €9,800
12%      €240
6%        €82

[Export]

The architecture explicitly says the VAT report is still absent even though the report infrastructure exists.

Plans / Usage

The entitlement backend already returns tier, features, meters, usage and limits. Build:

BillingOverview

Your plan

PRO
€29 / month

Usage

Invoices
██████████░░ 82 / 100

Clients
██████░░░░░░ 61 / 100

Documents
████░░░░░░░░ 42 / 100

Peppol
████████░░░░ 8 / 10

[Manage plan]

The audit specifically says this server-side matrix exists but currently isn't rendered.

22. Missing global UI infrastructure

I would also make these part of the implementation command:

ToastProvider

Every mutation gets:

✓ Invoice saved

or:

! Invoice could not be saved
Retry

The audit explicitly calls out that mutations currently have no transient confirmation.

SearchBar

Per-list search, separate from ⌘K navigation.

The audit explicitly distinguishes these.

NotificationCenter

Header notification surface.

SuccessState

For:

invoice sent
payment recorded
template saved
export completed
FileUpload

Needed for:

company logo
documents
CSV import

The audit identifies blob storage as the backend blocker for the actual upload capability.

Stepper

For onboarding.

LanguageSwitcher

FR / NL / EN / ES runtime switching is currently not wired.

23. Navigation change I'd make

I'd also resolve the N1/N2/N3 issue at the same time.

The architecture currently has TopNav, while the reference demonstrates a persistent sidebar. The audit explicitly says this is a product decision, not a component limitation; SidebarNav already exists.

For the expanded BillGen, I'd use:

┌──────────────────┬─────────────────────────────────────────────┐
│ BILLGEN          │                                             │
│                  │                                             │
│ Dashboard        │                                             │
│                  │                                             │
│ SALES            │                                             │
│  Invoices     12 │                                             │
│  Quotes          │                                             │
│  Credit notes    │                                             │
│  Payments        │                                             │
│                  │                                             │
│ CUSTOMERS        │                                             │
│  Clients         │                                             │
│                  │                                             │
│ CATALOG          │                                             │
│  Products        │                                             │
│  Services        │                                             │
│                  │                                             │
│ REPORTS          │                                             │
│                  │                                             │
│ SETTINGS         │                                             │
│                  │                                             │
│ ───────────────  │                                             │
│ Acme SRL      ↓  │                                             │
└──────────────────┴─────────────────────────────────────────────┘

Then inside invoices:

Invoices

All 42
Drafts 7
Issued 12
Paid 18
Partial 2
Overdue 3
Cancelled 0

And clicking an invoice gives the N3 inspector/detail layer.

That directly follows the architecture's N1/N2/N3 model.

The implementation hierarchy

I would give the coding agent this exact hierarchy:

INVOICE PRODUCT SURFACE
│
├── InvoiceList
│   ├── status tabs
│   ├── search
│   ├── filters
│   ├── pagination
│   ├── row actions
│   └── InvoiceDrawer
│
├── InvoiceWorkspace
│   ├── InvoiceStepper
│   ├── CustomerPicker
│   ├── CreateCustomerDrawer
│   ├── InvoiceMeta
│   ├── InvoiceItemsEditor
│   │   ├── ItemRow
│   │   ├── ProductCombobox
│   │   └── EditItemDrawer
│   ├── PaymentSection
│   ├── NotesSection
│   ├── InvoiceTotals
│   ├── InvoiceReadiness
│   ├── LiveInvoicePreview
│   └── InvoiceReview
│
├── InvoiceDetail
│   ├── RecordLayout
│   ├── DataList
│   ├── InvoicePreview
│   ├── FinancialSummary
│   ├── StatusTimeline
│   ├── PaymentHistory
│   └── InvoiceActions
│
├── Delivery
│   ├── EmailInvoiceDrawer
│   ├── PeppolDeliveryPanel
│   ├── ExportPanel
│   └── DeliverySuccess
│
└── TEMPLATE STUDIO
    │
    ├── TemplateList
    │   ├── TemplateCard
    │   ├── DefaultBadge
    │   └── TemplateActions
    │
    ├── TemplateWorkspace
    │   ├── BlockLibrary
    │   ├── TemplateCanvas
    │   ├── PropertyPanel
    │   ├── AppearancePanel
    │   ├── TypographyPanel
    │   ├── LayoutPanel
    │   └── SampleDataSelector
    │
    ├── TemplateBlocks
    │   ├── HeaderBlock
    │   ├── PartiesBlock
    │   ├── DocumentMetaBlock
    │   ├── ItemsBlock
    │   ├── TotalsBlock
    │   ├── PaymentBlock
    │   ├── NotesBlock
    │   ├── TermsBlock
    │   └── FooterBlock
    │
    └── TemplateManagement
        ├── TemplateVersions
        ├── DuplicateTemplate
        ├── SetDefaultTemplate
        └── DeleteTemplate
And the missing product UI around it
GLOBAL
├── SidebarNav
├── SectionTabs
├── SearchBar
├── ToastProvider
├── NotificationCenter
├── SuccessState
├── ConfirmDialog
└── FileUpload

COMPANY
├── CompanySettings
├── CompanyValidation
└── CompanyLogo

SALES
├── Invoices
├── Invoice Workspace
├── Quotes
├── Credit Notes
├── Payments
└── Recurring Invoices

CATALOG
├── Products
├── Services
├── Categories
├── Pricing
└── VAT

REPORTS
├── Revenue
├── Invoice report
├── Payments
├── Outstanding
├── Overdue
├── VAT
└── Export

BILLING
├── Current plan
├── Usage
├── Entitlements
├── Upgrade
└── Billing history

SETTINGS
├── Company
├── Invoice templates
├── Preferences
├── Languages
├── Notifications
└── Security
One architectural rule I would make non-negotiable

Invoice data and invoice presentation stay separate.

Invoice
   │
   ├── customer
   ├── lines
   ├── taxes
   ├── totals
   ├── payment
   └── compliance data
             │
             ├───────────────┐
             ▼               ▼
       Template Engine    UBL Generator
             │               │
             ▼               ▼
            PDF           Peppol XML

The audit confirms that the domain/UBL side is already substantially built, including validated BIS 3.0 XML; the missing product layer is primarily the frontend and the final Peppol transport hop.

That is the frontend I would build now: not another generic form, but a complete BillGen document workspace, with the template studio as a sibling product surface and the remaining unrendered backend capabilities filled around it.