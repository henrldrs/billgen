BillGen TVA Intelligence — Blueprint

The goal is to make TVA analysis a thread running through the entire BillGen process, rather than a separate accounting feature.

The core loop becomes:

Import → Extract → Validate → Classify → Calculate → Review → Reconcile → Export

And every operation that happens asynchronously must visibly use the existing Loading component rather than leaving the user wondering whether BillGen is working.

1. Where the TVA thread sits in BillGen
BillGen
│
├── Dashboard
│
├── Invoices
│   └── New invoice
│       ├── Who are you billing?
│       ├── What are you billing?
│       ├── How should it be billed?
│       ├── TVA
│       ├── Review
│       └── Send / Export
│
├── Expenses
│   ├── Expense inbox
│   ├── Import expenses
│   ├── Expense detail
│   └── TVA analysis
│
└── TVA
    ├── Overview
    ├── Analyzer
    ├── Exceptions / Review
    └── Reconciliation

Important: TVA should appear in multiple places, but there should remain one source of truth for the TVA calculation.

2. The main process
Step 01 — Import

User enters:

Expenses → Import expenses

Supported entry points:

Upload files
    ↓
PDF / image / CSV / spreadsheet
    ↓
BillGen processing
Background state

Immediately show the Loading component.

Loading expenses…

For multiple documents:

Processing 24 expenses
███████████░░░ 17 / 24

Do not freeze the entire page.

The user should still be able to navigate away while processing continues.

When finished

24 expenses imported

21 ready for analysis
3 need your attention

CTA:

Review expenses

3. Step 02 — Extraction

Every imported document becomes an expense record.

BillGen extracts:

Supplier
Invoice number
Invoice date

Subtotal / HT
TVA rate
TVA amount
Total / TTC

Currency
Expense category
Document type
Background processing

Use Loading component

Extracting invoice information…

If extraction is taking longer:

Still processing…
You can continue working while BillGen analyzes your documents.

This distinction matters:

Loading = active background work

Empty state = nothing is happening

Never use an empty state while the system is actually processing.

4. Step 03 — Document validation

Once extraction finishes, BillGen automatically validates the document.

Imported expense
        ↓
Document validation
        ↓
 ┌───────────────┐
 │ Valid         │
 │ Needs review  │
 │ Invalid       │
 └───────────────┘

Checks can include:

required invoice information
supplier information
TVA/VAT number
invoice number
date
mathematical consistency
TVA rate
TVA amount
HT / TVA / TTC relationship
duplicate invoice detection
Background state

Use Loading component

Checking invoice…

Then expose the result:

Document check

✓ 8 checks passed

or

⚠ 2 checks need review

5. Step 04 — TVA classification

This is the heart of the feature.

Each expense receives a TVA treatment:

🟢 Recoverable

€21 TVA potentially recoverable

🟠 Partially recoverable

€105 TVA detected
€52.50 potentially recoverable

⚪ Not recoverable

€21 TVA detected
€0 potentially recoverable

🟡 Review required

€60 TVA detected
Treatment requires your review

The system should never silently convert uncertainty into a deduction.

6. Step 05 — TVA analysis

Once expenses are processed, BillGen aggregates them.

TVA Analyzer
TVA position

€2,840
Potentially recoverable TVA

€18,420
TVA collected

€15,580
Estimated TVA payable

Then:

84 expenses analyzed

Recoverable       €2,840
Review required     €426
Not recoverable     €184
Background state

When recalculating:

Use Loading component

Recalculating TVA position…

This should appear when:

new expenses are imported
an expense is edited
a classification changes
a user changes a deductible percentage
a reporting period changes
rules are recalculated
7. Step 06 — Exceptions become a work queue

Don't make users hunt for problematic expenses.

Create:

TVA needs your attention

Example:

7 expenses need review

Restaurant
€60 TVA
Review required

Vehicle expense
€105 TVA
Partial recovery

Supplier invoice
€42 TVA
Missing TVA number

Each item should explain why it was flagged.

Example:

Why we're flagging this

The document contains TVA, but BillGen cannot establish sufficient information to determine its treatment automatically.

CTA:

Review expense

8. Step 07 — Evidence view

This is where the feature becomes particularly strong.

When opening an expense:

┌──────────────────────────┬──────────────────────────┐
│                          │ TVA analysis             │
│                          │                          │
│     SOURCE INVOICE       │ €105 TVA detected        │
│                          │                          │
│     [PDF / document]     │ €105 potentially        │
│                          │ recoverable              │
│                          │                          │
│                          │ Confidence: High         │
│                          │                          │
│                          │ ✓ Supplier identified    │
│                          │ ✓ TVA amount valid       │
│                          │ ✓ Invoice information    │
│                          │                          │
│                          │ [Accept] [Review]        │
└──────────────────────────┴──────────────────────────┘

The fundamental UX principle:

Every TVA conclusion should be traceable back to the document.

9. Step 08 — User confirmation

For uncertain cases:

BillGen suggestion

€52.50 potentially recoverable

Why?
Vehicle expense appears business-related,
but recovery may be limited.

[Accept] [Change treatment]

If the user changes it:

Recovery
○ Fully recoverable
● Partially recoverable
○ Not recoverable

Then:

Recalculate

Background

Use Loading component

Updating TVA analysis…

10. Step 09 — Period reconciliation

The TVA thread should eventually converge into a period-level view.

TVA — Q3 2026

Sales
€18,420 collected TVA

Expenses
€2,840 recoverable TVA

────────────────

Estimated TVA payable
€15,580

Then show:

Where it comes from

Collected TVA

Invoice A — €420
Invoice B — €850
Invoice C — €1,200
…

Recoverable TVA

Office supplies — €21
Vehicle — €105
Software — €42
…

The user can drill all the way down to the source document.

11. Step 10 — Final fiscal review

Before exporting/submitting anything, introduce a deliberate checkpoint:

TVA review

BillGen found €2,840 potentially recoverable TVA across 84 expenses.

Then:

Ready

77 expenses

Needs review

7 expenses

The primary CTA should not be available as if everything were automatically correct.

Instead:

Review 7 exceptions

Once resolved:

TVA analysis complete

84 expenses reviewed
€2,840 potentially recoverable
0 unresolved exceptions

Then:

Export report

12. Loading component rules

I'd make this an explicit product rule across the whole TVA thread.

Use the Loading component for:
Operation	Loading state
Importing documents	✓
OCR / extraction	✓
Validating invoices	✓
Detecting duplicates	✓
Classifying expenses	✓
Calculating TVA	✓
Recalculating after edits	✓
Generating report	✓
Reconciliation	✓
Export preparation	✓
Don't use it for:
empty expense lists
no TVA detected
completed analysis
errors
permission problems
validation warnings

Those need dedicated states.

13. The state machine

This is useful for implementation because the UI should be driven by explicit states rather than scattered booleans.

IMPORTED
   ↓
PROCESSING
   ↓
EXTRACTED
   ↓
VALIDATING
   ↓
CLASSIFYING
   ↓
ANALYZED
   │
   ├── RECOVERABLE
   ├── PARTIAL
   ├── NON_RECOVERABLE
   └── REVIEW_REQUIRED
             ↓
          REVIEWED
             ↓
        RECONCILED
             ↓
           READY

Any asynchronous state:

PROCESSING
VALIDATING
CLASSIFYING
RECALCULATING
RECONCILING
EXPORTING

→ Loading component

14. How it connects to invoice creation

This should also flow back into invoices.

When creating an invoice:

New invoice
    ↓
Client
    ↓
Line items
    ↓
TVA
    ↓
Review

The invoice contributes to:

TVA collected

While imported expenses contribute to:

TVA recoverable

So the two sides eventually meet:

                 BILLGEN
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
     INVOICES                EXPENSES
        ↓                       ↓
 TVA collected            TVA recoverable
        │                       │
        └───────────┬───────────┘
                    ↓
              TVA ANALYZER
                    ↓
            TVA RECONCILIATION
                    ↓
             PERIOD REPORT

That gives BillGen a coherent financial story:

BillGen doesn't just create invoices. It understands the TVA generated by your business and the TVA potentially recoverable from its expenses.

15. Recommended MVP scope

I would not build the entire accounting ecosystem immediately.

Phase 1 — Foundation
Expense import
PDF/image extraction
HT / TVA / TTC extraction
TVA rate detection
document validation
recoverable / partial / non-recoverable / review states
Loading states
Expense detail with evidence
Phase 2 — Intelligence
TVA Analyzer
recovery totals
exception queue
confidence indicators
duplicate detection
automatic recalculation
Phase 3 — Reconciliation
invoice TVA collected
expense TVA recoverable
estimated TVA position
period filtering
reconciliation report
export
Phase 4 — Advanced
jurisdiction-specific TVA rules
historical analysis
anomaly detection
“potentially missed TVA” detection
recurring expense intelligence
accounting integrations

The key product decision I'd lock now: the analyzer should always distinguish “TVA detected”, “TVA potentially recoverable”, and “TVA confirmed by the user.” That gives you a much safer foundation for eventually making the feature jurisdiction-aware.