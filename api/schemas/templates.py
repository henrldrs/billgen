"""Wire shapes for document templates.

`TemplateBlock` and `TemplateAppearance` are the domain models, reused. That is
what puts the two refusals on the wire rather than only in the service: a POST
carrying `"accent_token": "#0f766e"` is rejected by Pydantic before a router
sees it, and so is a template that hides its totals block.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from core.models.template import TemplateAppearance, TemplateBlock


class TemplateCreateRequest(BaseModel):
    company_id: UUID
    name: str = Field(min_length=1, max_length=120)
    #  Which document this template prints. Quotes and credit notes carry
    #  different wording from an invoice, so a quote rendered through an invoice
    #  template says the wrong thing to a customer — the reason each type has
    #  its own templates and its own default.
    doc_type: str = Field(default="invoice", pattern="^(invoice|quote|credit_note)$")
    blocks: list[TemplateBlock] | None = None
    appearance: TemplateAppearance | None = None
    is_default: bool = False


class TemplateUpdateRequest(BaseModel):
    """Every field optional — this edits the draft, and a studio that autosaves
    one panel should not have to send the other three back."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    blocks: list[TemplateBlock] | None = None
    appearance: TemplateAppearance | None = None


class TemplateResponse(BaseModel):
    id: UUID
    organization_id: UUID
    company_id: UUID
    name: str
    doc_type: str
    is_default: bool
    blocks: list[TemplateBlock]
    appearance: TemplateAppearance
    published_version: int | None
    #  Derived. A template that has never been published cannot be attached to
    #  a document, and the gallery needs to say so without inferring it from a
    #  null.
    is_published: bool
    created_at: datetime
    updated_at: datetime


class TemplateSnapshotResponse(BaseModel):
    """What an issued invoice stores, by value.

    `template_id` is present so a screen can say where a document's layout came
    from — it is *not* what the renderer resolves. Resolving the id would give
    whatever the template says today, which is the failure the snapshot exists
    to prevent.
    """

    template_id: UUID
    template_name: str
    version: int
    taken_at: datetime
    blocks: list[TemplateBlock]
    appearance: TemplateAppearance
