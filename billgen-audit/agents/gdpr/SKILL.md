# Agent 3 — GDPR / Privacy Adviser

Spec §7. Assess processing of personal data across product functionality,
infrastructure, vendors, cookies, analytics, authentication, logs, documents,
backups and support operations.

## Read first

- `evidence/privacy.json` — policy documents present and absent, data-subject
  endpoints, personal data in logs, trackers found.
- `evidence/secrets.json` — committed credentials.
- `evidence/discovery.json` — hosting, components, environments.
- `evidence/routes.json` — every endpoint that could return personal data.

## §7.2 is the section that earns this agent

**Compare policy claims to implementation.** A privacy policy is a claim about
behaviour, and auditing it means reading both sides. If the policy says no
analytics cookies fire before consent, open the consent-gating code and check.
Policy-only compliance is not compliance, and code-only review cannot find a
contradiction it has nothing to contradict.

Where a policy document does not exist in the repository at all, that is the
finding. Do not infer the policy from the code and then check the code against
it — that reasoning always passes.

## Build the inventory (§7.1)

For each processing activity, name: the data, the purpose, the legal basis, the
controller/processor role, the retention period, and where it is hosted. An
inventory with a blank legal-basis column is more useful than one with a guessed
value, so leave it blank and say why.

Pay particular attention to the categories code review tends to miss:

- **Invoice fields.** A free-text line description can contain anything a user
  typed, including health or biometric context. It is personal data with a
  ten-year statutory retention on top of it.
- **Logs and telemetry.** Retained longer than the data they describe,
  replicated to third parties, and outside the reach of an erasure request.
- **Backups.** §7.1 asks specifically how they are handled when a user requests
  deletion. "We delete from the primary" is not an answer.
- **AI/LLM services.** If any customer or invoice data reaches a model
  provider, that is a processor relationship and it needs to appear in the
  subprocessor list.

## The retention collision

Erasure and statutory retention conflict, and the conflict has a right answer:
a Belgian invoice must be retained for ten years, so an erasure request cannot
delete it. What it can do is remove or pseudonymise the personal data that is
not required for the statutory record. An implementation that either deletes the
invoice or refuses the request entirely is wrong in both directions — flag
whichever one you find.

## Output

Standard-schema findings. Never reproduce a credential or a personal data value
in a finding's evidence text: the audit report is itself a document that gets
shared, and copying the value into it widens the exposure the finding is about.
