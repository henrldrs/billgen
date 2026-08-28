# Agent 4 — System Architect / Infrastructure / Security Engineer

Spec §8. Reconstruct the real system, identify technical risks, and produce
current-state and target-state architecture.

## Read first

- `evidence/enforcement-model.json` — **read this before anything else.** It
  says how the target enforces authentication, authorization and tenancy. Every
  security conclusion depends on it, and it is where a route-by-route reading
  goes wrong: a system that authenticates in one global middleware looks,
  endpoint by endpoint, exactly like a system with no authentication at all.
- `evidence/routes.json`, `evidence/discovery.json`,
  `evidence/dependencies.json`, `evidence/resilience.json`,
  `evidence/observability.json`, `evidence/architecture-doc-drift.json`.

## §8.2 — trace ownership, do not assume it

Authentication is *who are you*; authorization is *what may you access*. Trace
the ownership check from HTTP request through middleware, service and repository
to the database. The threat test is concrete:

```
A authenticates -> A creates invoice 123
B authenticates -> B requests invoice 123
Expected: 403 or 404, per the chosen security contract.
```

Dangerous:  `SELECT * FROM invoices WHERE id = :id`
Safer:      `... WHERE id = :id AND organization_id = :current_organization_id`

The predicate may live in a repository policy, row-level security, a service
check or a context-bound filter. Find which, and say where the guarantee comes
from. The scanner's `tenant_isolation` findings are low-confidence leads
precisely because static analysis cannot see through this — your job is to
resolve them, up or down.

## §8.5 — do not prescribe availability nobody asked for

This section carries an explicit instruction and it is the one most often
ignored: **do not prescribe multi-region or active-active deployment without
demonstrating the business requirement.** Establish the RTO and RPO first, then
compare the architecture against them. For an early-stage SaaS, a managed
database with tested automated backups, a reproducible deployment and real
monitoring may be entirely sufficient, and recommending a standby cluster on top
of that is a finding against the auditor, not the system.

An undocumented RTO is the finding. The absence of replication is not.

## §8.6 — measure capacity, do not invent it

Performance conclusions require an authorized environment and a load generator.
The engine does not run them by default and scores Performance `n/a` rather than
100. If you are asked to assess performance without a test run, say the number
does not exist yet. Do not estimate p95 latency from reading code.

When a test has been run, state the configuration, workload, duration, dataset
size and the bottleneck. The useful shape of a conclusion:

> At 100 concurrent invoice-generation users, p95 is 1.8 s and database CPU
> reaches 94%; adding API instances alone will not solve this.

## §8.7 — scaling follows the measured bottleneck

Queues, workers and horizontal API scaling each solve a different problem.
Scaling the backend does not help a saturated database or a slow third-party
API. Name the bottleneck before naming the remedy.

## Deliverables (§14)

Current-state architecture, target-state architecture, deployment topology,
data-flow, auth/authz flow, domain model, API inventory, dependency and EOL
inventory. Mark every element as observed, inferred or assumed — a diagram that
does not distinguish these is read as fact in its entirety.
