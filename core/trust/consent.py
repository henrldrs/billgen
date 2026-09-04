"""Cookie and tracking consent — the categories, and what a decision looks like.

BillGen runs no analytics today. Every cookie it sets is a session cookie it
cannot work without, which is the only reason the missing consent banner is not
already a live compliance breach. That makes this module cheap to write now and
expensive to write later: the day one analytics script is added, consent has to
already exist, because retro-fitting it means asking every existing user again.

**What is here:** the category taxonomy, the defaults (essential on and
un-toggleable; everything else off until someone opts in), and the shape of a
recorded decision.

**What is not here:** storage. A `ConsentDecision` has nowhere to be written —
there is no table, and B2 (blob storage) is unrelated to it. That is the single
remaining gap between this module and a working cookie banner, and it is named
in the IA node `settings.cookies` rather than hidden here.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class ConsentCategory(str, Enum):
    ESSENTIAL = "essential"
    FUNCTIONAL = "functional"
    ANALYTICS = "analytics"
    MARKETING = "marketing"


class CategoryInfo(BaseModel):
    """One row of the cookie table, and the rule that governs it."""

    category: ConsentCategory
    label: str
    purpose: str
    #  Essential means "the product does not function without it", which is the
    #  legal test — not "we would rather not ask". An essential category cannot
    #  be switched off, so the UI renders it as a locked row.
    essential: bool = False
    default_on: bool = False
    #  What actually runs in this category today. An empty tuple is the honest
    #  answer for three of the four, and the reason the banner is not yet a fire.
    in_use: tuple[str, ...] = ()


CATEGORIES: tuple[CategoryInfo, ...] = (
    CategoryInfo(
        category=ConsentCategory.ESSENTIAL,
        label="Essential",
        purpose="Sign-in session, CSRF protection, and the language you chose.",
        essential=True,
        default_on=True,
        in_use=("session token", "refresh token", "interface language"),
    ),
    CategoryInfo(
        category=ConsentCategory.FUNCTIONAL,
        label="Functional",
        purpose=(
            "Remembers preferences that are convenient but not required — "
            "theme, table density."
        ),
        in_use=("theme choice",),
    ),
    CategoryInfo(
        category=ConsentCategory.ANALYTICS,
        label="Analytics",
        purpose="Aggregate product usage, so a screen nobody opens can be found and removed.",
    ),
    CategoryInfo(
        category=ConsentCategory.MARKETING,
        label="Marketing",
        purpose="Attribution for advertising. Nothing of the sort runs, and nothing is planned.",
    ),
)

_BY_CATEGORY = {info.category: info for info in CATEGORIES}


def categories() -> tuple[CategoryInfo, ...]:
    return CATEGORIES


def default_state() -> dict[ConsentCategory, bool]:
    """The state before anyone has chosen: essential on, everything else off.

    Pre-ticked boxes are not consent (GDPR art. 4(11), and Planet49 settled it),
    so `default_on` is False for every non-essential category by construction —
    a future category that forgets to say so inherits the safe answer.
    """
    return {info.category: info.default_on for info in CATEGORIES}


def normalise(
    choices: dict[str, bool] | dict[ConsentCategory, bool],
) -> dict[ConsentCategory, bool]:
    """Turn whatever the banner posted into a complete, lawful state.

    Three corrections, all of which a hand-written handler eventually gets
    wrong: an essential category is forced on however it was submitted, an
    unknown key is dropped rather than stored, and a category the payload
    omitted falls back to its default (off) instead of vanishing — a missing
    key must never read as "consented" further down.
    """
    state = default_state()
    for raw_key, value in choices.items():
        key = raw_key.value if isinstance(raw_key, ConsentCategory) else str(raw_key)
        try:
            category = ConsentCategory(key)
        except ValueError:
            continue
        state[category] = bool(value)

    for info in CATEGORIES:
        if info.essential:
            state[info.category] = True
    return state


class ConsentDecision(BaseModel):
    """One person's answer, at one moment, to one version of the policy.

    Versioned deliberately: consent is to a *stated* set of purposes, so a
    policy that changes materially invalidates the decisions taken under the
    old one. Storing the version is what makes "must we ask again?" answerable
    without a lawyer re-reading a diff.
    """

    user_id: UUID | None = None
    #  Anonymous visitors on the marketing site consent too, and have no user
    #  id — the banner's own opaque id stands in for them.
    visitor_id: str | None = None
    policy_version: str
    state: dict[ConsentCategory, bool]
    source: str = Field(default="banner", pattern="^(banner|settings)$")
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def taken(
        cls,
        choices: dict[str, bool] | dict[ConsentCategory, bool],
        *,
        policy_version: str,
        user_id: UUID | None = None,
        visitor_id: str | None = None,
        source: str = "banner",
    ) -> ConsentDecision:
        return cls(
            user_id=user_id,
            visitor_id=visitor_id,
            policy_version=policy_version,
            state=normalise(choices),
            source=source,
        )

    def allows(self, category: ConsentCategory) -> bool:
        return self.state.get(category, False)


def category_info(category: ConsentCategory) -> CategoryInfo:
    return _BY_CATEGORY[category]
