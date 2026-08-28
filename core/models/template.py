"""Document templates as the domain sees them.

Mirrors `frontend-react/src/workspace/templateSchema.ts`, and deliberately does
**not** mirror it field for field.

The nine block kinds each carry a different property set — twenty-odd booleans
and enums between them. Restating all of that in Pydantic would create two
schemas for one concept in two languages, and they would diverge on the first
change; the divergence would be silent, because both sides would keep
validating happily against their own copy.

So the split follows the audit specification's §10: *the visual editor
customises presentation, not legal or accounting truth.* The server enforces
exactly the part that is load-bearing and lets the frontend own the rest:

  * every **required block** is present and visible — an invoice missing its
    parties or its totals is not a styling choice, it is an invalid document;
  * every block is a **known kind**, so a typo cannot reach the renderer;
  * appearance carries **one** brand colour and token names for the rest. A
    document is the customer's stationery and needs their colour; what is
    refused is a colour *per block*, and raw values for text and rules, where
    one keystroke produces white-on-white that only fails on a printed page.

`properties` stays an open dict on purpose. It is presentation, the frontend is
its author, and validating it here would buy a second source of truth.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from enum import Enum
from uuid import UUID

from pydantic import Field, field_validator

from ._base import DomainModel, TenantModel


class BlockKind(str, Enum):
    HEADER = "header"
    PARTIES = "parties"
    DOCUMENT_META = "document_meta"
    ITEMS = "items"
    TOTALS = "totals"
    PAYMENT = "payment"
    NOTES = "notes"
    TERMS = "terms"
    FOOTER = "footer"


#  Without these a generated document can omit a mention Belgian law requires.
#  `REQUIRED_BLOCKS` in templateSchema.ts is the same list; this is the copy
#  that is enforced, because the frontend's can be bypassed by any other client.
REQUIRED_BLOCKS: frozenset[BlockKind] = frozenset(
    {
        BlockKind.HEADER,
        BlockKind.PARTIES,
        BlockKind.DOCUMENT_META,
        BlockKind.ITEMS,
        BlockKind.TOTALS,
    }
)


class TemplateBlock(DomainModel):
    id: str = Field(min_length=1, max_length=64)
    kind: BlockKind
    visible: bool = True
    properties: dict = Field(default_factory=dict)


#  Faces the PDF renderer can actually draw. `core/pdf` renders through
#  Chromium with two vendored files (Satoshi, Geist Mono); the rest are families
#  Chromium resolves on every platform BillGen targets. Offering a font the
#  preview shows and the PDF silently substitutes is worse than offering six
#  that always match.
FONT_CHOICES: frozenset[str] = frozenset(
    {"Satoshi", "Geist Mono", "Helvetica", "Georgia", "Times New Roman", "Verdana"}
)

_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


class TemplateAppearance(DomainModel):
    """One brand colour, and token names for everything else.

    This started life refusing colour outright. That was right for the app's
    chrome and wrong for a *document*: an invoice is the customer's own
    stationery, and a company that cannot put its colour on it will not use the
    studio. What survives from the original decision is the shape, which is the
    part that mattered — **one** colour in **one** field, not a hex per block,
    which is how a template becomes unreadable and impossible to re-skin.
    """

    #  Resolved into `--bg-brand` when the document is rendered.
    brand_color: str = Field(default="#0f766e", max_length=7)

    #  Still tokens. These two carry legibility rather than identity, and a user
    #  who sets them by hand sets them wrong — white-on-white is one keystroke
    #  away and the failure only shows up on a printed page.
    text_token: str = Field(default="--bg-ink", max_length=64)
    border_token: str = Field(default="--bg-line", max_length=64)

    font_family: str = Field(default="Satoshi", max_length=64)
    body_size_pt: int = Field(default=10, ge=6, le=16)
    heading_size_pt: int = Field(default=16, ge=8, le=34)

    page_size: str = Field(default="A4", pattern="^(A4|Letter)$")
    margins: str = Field(default="standard", pattern="^(narrow|standard|wide)$")
    density: str = Field(default="comfortable", pattern="^(compact|comfortable|spacious)$")

    @field_validator("brand_color")
    @classmethod
    def _must_be_a_six_digit_hex(cls, value: str) -> str:
        """Exactly `#rrggbb`.

        Not a free string: this value is interpolated into a style attribute
        when the document renders, so anything that is not a colour is either a
        broken document or an injection point.
        """
        if not _HEX.match(value):
            raise ValueError(
                f"brand_color must be a six-digit hex colour like '#0f766e', "
                f"not {value!r}."
            )
        return value.lower()

    @field_validator("text_token", "border_token")
    @classmethod
    def _must_be_a_token(cls, value: str) -> str:
        """A CSS custom property name, never a colour.

        The palette guard walks the source tree, so it cannot see a hex stored
        in a database row. This is that guard, for the fields where it still
        applies.
        """
        if value != "transparent" and not value.startswith("--"):
            raise ValueError(
                f"{value!r} is not a token name. Text and rule colours take a "
                f"token like '--bg-ink' so a document stays legible in print and "
                f"survives a re-skin; only brand_color is a literal colour."
            )
        return value

    @field_validator("font_family")
    @classmethod
    def _must_be_a_renderable_face(cls, value: str) -> str:
        if value not in FONT_CHOICES:
            raise ValueError(
                f"{value!r} is not a face the PDF renderer can draw. Choose one "
                f"of: {', '.join(sorted(FONT_CHOICES))}."
            )
        return value


def default_blocks() -> list[TemplateBlock]:
    """Every kind, with the optional ones switched off.

    Hidden blocks stay in the list so their properties survive a toggle — the
    same decision the frontend takes, and the reason a user who hides Notes and
    changes their mind does not lose what they wrote.
    """
    return [
        TemplateBlock(id=kind.value, kind=kind, visible=kind in REQUIRED_BLOCKS)
        for kind in BlockKind
    ]


class DocumentTemplate(TenantModel):
    company_id: UUID
    name: str = Field(min_length=1, max_length=120)
    doc_type: str = Field(default="invoice", pattern="^(invoice|quote|credit_note)$")
    is_default: bool = False

    blocks: list[TemplateBlock] = Field(default_factory=default_blocks)
    appearance: TemplateAppearance = Field(default_factory=TemplateAppearance)
    published_version: int | None = None

    @field_validator("blocks")
    @classmethod
    def _required_blocks_present_and_visible(
        cls, blocks: list[TemplateBlock]
    ) -> list[TemplateBlock]:
        visible = {b.kind for b in blocks if b.visible}
        missing = REQUIRED_BLOCKS - visible
        if missing:
            names = ", ".join(sorted(k.value for k in missing))
            raise ValueError(
                f"a template must show {names}. These carry mentions an invoice "
                f"is required to display, so hiding them is not a styling choice."
            )
        ids = [b.id for b in blocks]
        if len(ids) != len(set(ids)):
            raise ValueError("block ids must be unique within a template")
        return blocks

    @property
    def is_published(self) -> bool:
        return self.published_version is not None


class TemplateSnapshot(DomainModel):
    """What an issued invoice keeps. Rule 3, by value.

    It carries the blocks and appearance themselves rather than the template id,
    because an id resolves to whatever the template says *today* — which is the
    failure this type exists to prevent. `template_id` survives only so a screen
    can say which template a document came from.
    """

    template_id: UUID
    template_name: str
    version: int
    taken_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    blocks: list[TemplateBlock]
    appearance: TemplateAppearance

    @classmethod
    def of(cls, template: DocumentTemplate) -> TemplateSnapshot:
        if template.published_version is None:
            raise ValueError(
                f"template {template.name!r} has never been published; there is "
                f"no version to snapshot."
            )
        return cls(
            template_id=template.id,
            template_name=template.name,
            version=template.published_version,
            blocks=list(template.blocks),
            appearance=template.appearance,
        )
