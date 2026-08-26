"""Rename the 'personal' plan tier to 'starter'

The commercial tiers were settled as free / starter / business / business_pro.
`plan_tier` is a plain String(20) with no enum constraint, so this is a data
migration only — no schema change. Any row still saying 'personal' would fail
`PlanTier(...)` parsing after the rename, so it is rewritten here rather than
left to be discovered at runtime.

`business_pro` is new and has no predecessor to rename.

Revision ID: c4e1a7b20f38
Revises: b7f2c1a9d3e4
Create Date: 2026-08-26
"""

from collections.abc import Sequence

from alembic import op

revision: str = "c4e1a7b20f38"
down_revision: str | Sequence[str] | None = "b7f2c1a9d3e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE organizations SET plan_tier = 'starter' WHERE plan_tier = 'personal'")
    op.execute("UPDATE subscriptions SET plan_tier = 'starter' WHERE plan_tier = 'personal'")


def downgrade() -> None:
    # business_pro has no pre-rename equivalent; it collapses to business, which
    # is the closest tier that existed before.
    op.execute("UPDATE organizations SET plan_tier = 'personal' WHERE plan_tier = 'starter'")
    op.execute("UPDATE subscriptions SET plan_tier = 'personal' WHERE plan_tier = 'starter'")
    op.execute(
        "UPDATE organizations SET plan_tier = 'business' WHERE plan_tier = 'business_pro'"
    )
    op.execute(
        "UPDATE subscriptions SET plan_tier = 'business' WHERE plan_tier = 'business_pro'"
    )
