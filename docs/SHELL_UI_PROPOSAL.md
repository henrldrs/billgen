# Shell UI — a proposed reorganisation

Written 2026-09-03, after the site's palette and components came into
`@henrioutai/ui`. **This is a proposal, not a plan of record.** UI comes from
Henri's drawings; nothing here is built, and the two pieces that already exist
(`EuroField`, `Card frosted`) are exported but used by no product screen.

Read it beside `/_preview` → *Palette + grounds*, which is the same material as
pixels.

---

## What the shell is now

One ground, one density, one surface treatment. `.bg-app-shell` paints
`--bg-app-backdrop` and everything sits on it at the same elevation: the top
bar, the primary nav, the page header, then cards. Every screen — a dashboard
of four numbers, a table of four hundred rows, a form with six fields — gets
the identical frame at the identical width.

That is not a criticism of how it was built; it is what a shell should be
until there is a reason to differentiate. The site now supplies the reason: it
has a vocabulary of grounds and elevations the app has no equivalent of, and
the palette work made that vocabulary available rather than merely admired.

## The one idea

**Elevation should track what a surface is for, not what component drew it.**

The site does this without saying so. Its paper carries the argument, its deep
field carries the proof, and the seam between them tells you which you are
reading. The app has the same two categories and renders them identically:

| | Today | Proposed |
|---|---|---|
| **Working surfaces** — composer, forms, tables, anything you edit | card on backdrop | stays exactly as it is: opaque, high contrast, no frost, full width |
| **Reference surfaces** — dashboard tiles, report headlines, empty states, onboarding, the record drawer's summary | card on backdrop | the deep field, glass, the € motif behind |

The value is legibility, not decoration: a person can tell at a glance whether
they are looking at something they can change.

---

## Five proposals, in the order I would do them

### 1. The floating glass bar — already asked for, 2026-09-03

Wanted: rounded corners, **opaque at rest**, going translucent over the ground
once the page is scrolled. The tokens for this now exist
(`--bg-topbar-translucent`, `--bg-deep-glass*`), and `TopNav` already takes a
`variant="translucent" | "glass"`, so this is a shell change rather than a
component one.

The one decision it needs from you: **does the bar float over the content, or
does the content start below it?** Floating buys the effect and costs a scroll
shadow plus a scroll-padding fix for anchor links. I would float it.

*Cost: small. This is the highest ratio of visible change to work on the list.*

### 2. A measure for reading, full width for data

The site runs content at 70% of the viewport above `lg`, with 15% free on each
side. That is right for prose and wrong for a table of invoices, which is why
this should not be one rule:

- **Record and form screens** (composer, client 360, settings, onboarding) take
  the measure. They are read, not scanned.
- **List and report screens** stay full width. Taking 30% away from an invoice
  table to make it elegant is making it worse.

Concretely one class with two variants, chosen per route in `ia.ts` rather than
per component — the IA already knows which kind of screen each node is.

*Cost: small, but it touches every route. Worth doing in one pass, not per screen.*

### 3. The € field, in exactly four places

It is texture, and texture used everywhere is wallpaper. It earns its place
where a screen is otherwise empty or otherwise ceremonial:

- **Login and onboarding** — the first thing anyone sees, and today it is a
  form on a flat ground.
- **Empty states** — "no invoices yet" is the emptiest surface in the product.
- **The dashboard's header zone**, behind the KPI row only, not behind the
  chart or the table.
- **The PDF preview's surround** — the page floats on something.

**Not** behind tables, forms, or anything with a scroll. `mix-blend-mode` on a
scrolling container repaints on every frame.

*Cost: small each, and independent — they can land one at a time.*

### 4. The deep field as a real zone, not just dark mode

Dark mode is now the sapphire field. The larger idea is that light mode could
use it too, for the reference surfaces in the table above — a dashboard whose
KPI band sits on the deep field over paper, with the seam between them, is the
site's own composition applied to the product.

This is the proposal I am least sure of, and the one that most needs your eye.
It could read as premium, and it could read as a marketing page bolted onto an
invoicing tool. **It should be drawn before it is built.**

*Cost: medium, and it is a visual-language commitment rather than a token change.*

### 5. Frosted cards, sparingly

`Card frosted` exists. It should stay off by default and be turned on for
**overlays only** — the ⌘K palette, modals, the record drawer — where there is
one of them, it sits over content, and the blur is doing real work of showing
you what is behind. On a list of cards it is an expensive way to make text
harder to read.

*Cost: trivial, once 4 is settled — these are the same surfaces.*

---

## What I would not do

- **Re-skin the working surfaces.** The composer and the tables are legible and
  dense. The site's job is to persuade; theirs is to be worked in for an hour
  at a time, and glass over a form is a cost the user pays and the product does
  not.
- **Move the accent.** Emerald still carries actions in both themes. Sapphire
  is a ground, and a ground that also means "click me" means neither.
- **Touch the nav structure.** The 3-depth IA and the single `+` creator are
  settled and are not what this is about.

## The open question underneath all five

The proposals above assume the app keeps **one visual language across light and
dark**, with the sapphire field as dark mode's ground and an optional zone in
light mode. The alternative — the app adopts the deep field as its primary
surface in both themes, marketing-page style — is a different product to look
at, and would make items 2, 3 and 5 answer differently.

That is the fork. It is the third option from the palette question and it was
not chosen, so this document assumes it was not meant; say so if it was.
