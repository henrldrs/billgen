# TVA Intelligence — frontend scaffold

Written from [`docs/tva_feature_future.md`](../../../docs/tva_feature_future.md).
Section references (§n) are to that blueprint. The backend half is
[`core/tva/`](../../../core/tva/README.md) and carries the domain rules.

**This directory is not wired.** `src/index.ts` does not re-export it,
`tva.css` is imported by nothing, and no route or `ia.ts` node exists. It does
typecheck, because `tsc` covers `src/**`.

## What is here

| File | Blueprint | Notes |
|---|---|---|
| `states.ts` | §12, §13 | The state machine, mirrored from the server, plus the one Loading predicate. |
| `types.ts` | — | Hand-written response shapes. Delete them when the endpoints ship generated ones. |
| `ExpenseImportPanel.tsx` | §2 | Per-document progress, and an outcome split into ready / needs attention. |
| `ExpenseEvidencePanel.tsx` | §7, §8 | Document beside the conclusion; treatment changed by radio, never by typing an amount. |
| `TvaExceptionQueue.tsx` | §6 | Every row says why it is flagged. |
| `TvaAnalyzerPanel.tsx` | §6, §10, §11 | Confirmed and potential recovery shown apart; export gated on exceptions. |

## The Loading rule, in one place

§12 asks for the Loading component on active background work and dedicated
states for everything else. That is `isWorking(state)` in `states.ts`, and it
is the only check any panel makes. An empty queue renders `EmptyState`, a
failure renders its own message, a finished analysis renders the result — none
of them a spinner.

`states.ts` is a **mirror of `core/tva/states.py` and can drift.** The fix at
integration is for the API to send the boolean alongside the state, at which
point the local set becomes a fallback. It is written as one exported predicate
so that is a one-line change.

## Three honesty constraints the panels enforce

1. **No combined "recoverable" figure.** `TvaPosition` has
   `confirmed_recoverable` and `potential_recoverable`, and
   `estimated_payable` uses only the first. The analyzer panel shows both as
   separate KPIs and labels which is which.
2. **Export is not the primary action while exceptions are open.** §11 wants a
   deliberate checkpoint, so the CTA becomes "Review N exceptions". A disabled
   Export next to a red count trains people to ignore the count.
3. **Nothing pretends the document is stored.** **B2 — blob storage** is
   unbuilt, so `ExpenseEvidencePanel` says the source is not stored rather than
   rendering an empty frame.

## What it deliberately does not do

- **No data fetching, no mutations.** Props in, callbacks out.
- **No i18n.** English literals; `t()` takes a closed `MessageKey` union. The
  reason-code sentences in `TvaExceptionQueue` are the ones that most need
  translating, and they fall through to the raw code for an unknown reason —
  visibly ugly on purpose, so a server rule the UI never learned about shows up
  instead of rendering as an empty string.
- **No background job UI beyond rendering progress.** §2 wants the user to
  navigate away while processing continues. That is a job runner on the server,
  not a component; `ExpenseImportPanel` renders a `progress` prop and claims
  nothing more.

## Integrating it

1. The backend first — see [`core/tva/README.md`](../../../core/tva/README.md),
   which has the ordered list. Nothing here is useful before `GET /expenses`
   and `GET /tva/position` exist.
2. CSS: `@import "@billgen/ui/src/tva/tva.css";` in
   `frontend-saas/src/styles.css`.
3. Replace `types.ts` with the generated types (`npm run generate:api`).
4. Export the panels from `src/index.ts`, add routes and `ia.ts` nodes for the
   four sections in §1 (Expense inbox, Import, Expense detail, TVA analysis).
5. Write the `.test.tsx` files. Every sibling panel has one; these do not yet.
