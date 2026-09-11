# How the installer reaches a person

Two repositories, on purpose.

| | |
|---|---|
| `henrldrs/billgen` | **Private.** Everything — core, licensing, the audit engine, this document. |
| `henrldrs/billgen-desktop` | **Public.** A README and Releases. No source, ever. |

The private repo builds the installer and pushes *one binary, its checksum and
its notices* into the public one. A person downloading BillGen sees a download
page and a file; they see none of the code, and nothing about the source
becomes public by shipping.

Decided 2026-09-11, over the three alternatives: making this repo public
publishes the product and cannot be undone (forks and caches outlive a revert);
private releases work for Emilia and nobody else, so they are not a hub; and
`billgen.be` on Vercel is a poor host for a 60–80 MB binary and gives up
versioning, checksums and download counts.

---

## Setting it up — once

1. **Create `henrldrs/billgen-desktop`, public, empty.**
2. **Seed it** with [`distribution/README.md`](../distribution/README.md) as
   its `README.md`. That file is the download page: it is written for the
   person downloading, not for a developer, and it says the three things they
   have to know before they click — that a licence is required, that Windows
   will warn them, and where their data will live.
3. **Create a fine-grained personal access token**, scoped to
   `henrldrs/billgen-desktop` alone, with **Contents: read and write**. The
   default `GITHUB_TOKEN` cannot do this: it is scoped to the repository the
   workflow runs in, which is the private one.
4. **Add it to the private repo** as the secret `RELEASE_TOKEN`
   (*Settings → Secrets and variables → Actions*).

## Publishing a version

```bash
git tag v0.1.0
git push origin v0.1.0
```

That is the whole act, and it is Henri's. `.github/workflows/release.yml`
builds on `windows-latest`, verifies, and opens a **draft** release on the
public repo. Drafts are invisible to the public until someone presses publish —
the last look before a file is downloadable by anyone is a person's.

`workflow_dispatch` runs the same build and verification and publishes nothing.
That is the one to use to see whether it works.

## What the runner proves

**`windows-latest` is the clean Windows VM T-20 and T-30 have been open on.**
No Python, no Playwright browsers, nothing this project put there. The workflow
assembles the runtime, runs `scripts/check_sidecar_runtime.py` against it, and
only then builds the installer — so a green run is the assertion both tickets
were waiting for a physical machine to make.

It does not prove the *installed* application starts, which is T-25's
remaining half: install it, uninstall it, and find `Documents\BillGen` still
there. That needs a person and a machine.

## Rules this pipeline keeps

- **No source leaves.** The release carries the installer, a `.sha256`, and
  `THIRD-PARTY-NOTICES.txt`. Nothing else is uploaded.
- **The licence key must be present or the build fails.** A build without
  `desktop/license_key.pub` cannot verify a licence and refuses to start
  (T-22); discovering that after publishing an installer is the failure this
  step exists to prevent.
- **Third-party notices ship with every release.** Generated from `uv.lock` at
  build time, so the file names what is actually inside that binary.
- **A tag publishes; nothing else does.** The boundary is the trigger, not
  somebody remembering it.

## What is still missing

| Gap | Consequence | Where it lives |
|---|---|---|
| **Code signing certificate** | Every download shows SmartScreen's *"Windows protected your PC"*. The README tells the truth about it rather than pretending; that is a patch, not a fix. | **T-38**. Needs the registered entity (BETA_LAUNCH_PLAN W1). |
| **Mentions légales on the download page** | A public page offering software needs them, and they need the BCE number. | BETA_LAUNCH_PLAN W1/W4; brief Q4. |
| **Terms covering the download** | Anyone downloading is a person you have distributed software to, with no stated terms. For a licensed beta the beta agreement covers it; for a public hub it will not. | T-29's texts; brief Q6. |
| **A licence request path** | The README says "e-mail us". At more than a handful of people that stops scaling. | Needs transactional mail (T-01). |

The first three are the same blocker wearing different clothes: a registered
business with a BCE number. Until then this hub can exist and can hand a build
to someone you have licensed personally, which is exactly the beta.
