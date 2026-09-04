"""Wire shapes for the L4 trust surfaces.

Separate models rather than returning `core.trust`'s own types, for the reason
every other schema module exists here: a domain type that is also the API
contract cannot be refactored without breaking a client. The registries below
are read by the marketing site as well as the app, which makes that doubly true.
"""

from datetime import date

from pydantic import BaseModel

from .activity import ActivityEntryResponse


class LegalDocumentResponse(BaseModel):
    key: str
    title: str
    ia_path: str
    audience: str
    requires_acceptance: bool
    #  False for all seven today. The field is the point of the endpoint: a
    #  client rendering this list can show what is outstanding instead of
    #  linking to seven empty pages.
    drafted: bool
    version: str | None
    effective_date: date | None
    blocks: list[str]
    note: str | None


class ConsentCategoryResponse(BaseModel):
    category: str
    label: str
    purpose: str
    essential: bool
    default_on: bool
    in_use: list[str]


class DataSetResponse(BaseModel):
    key: str
    label: str
    subject: str
    fields: list[str]
    purpose: str
    basis: str
    retention: str
    exportable: bool
    erasure: str
    source: str | None
    note: str | None


class SubprocessorResponse(BaseModel):
    name: str
    purpose: str
    location: str
    in_use: bool


class PrivacyRegisterResponse(BaseModel):
    """The art. 30 register, plus the two lists a privacy screen has to show.

    `retained_on_erasure` is not a convenience — it is the list a deletion
    dialog is obliged to display, because "delete everything" is false while
    seven years of invoices are legally frozen.
    """

    datasets: list[DataSetResponse]
    retained_on_erasure: list[str]
    subprocessors: list[SubprocessorResponse]


class AiSurfaceResponse(BaseModel):
    key: str
    label: str
    produces: str
    module: str
    risk: str
    confidence_field: str | None
    human_confirms: bool
    requires_marking: bool
    crosses_annex_iii: str | None
    note: str | None


class AiTransparencyResponse(BaseModel):
    """What must be marked as machine-generated, and from when."""

    obligation_date: date
    obligation_live: bool
    surfaces: list[AiSurfaceResponse]


class SecurityEventResponse(BaseModel):
    entry: ActivityEntryResponse
    kind: str
    severity: str
    label: str


class SecurityEventsResponse(BaseModel):
    """Events, and the blind spots — deliberately in the same payload.

    A list on its own would let the screen render an empty table as calm.
    `not_recorded` names the actions nothing writes yet (sign-in, sign-out,
    failures), so the absence of events is displayed as missing instrumentation
    rather than as a clean bill of health.
    """

    events: list[SecurityEventResponse]
    not_recorded: list[str]
