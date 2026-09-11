"""organizations that already had a company are stamped as onboarded

Revision ID: a7c41e9d5f02
Revises: f3a9d2c7b815
Create Date: 2026-09-11 13:00:00.000000

T-29's first-run gate sends any organization with no `onboarding_completed_at`
to the wizard. Every organization that exists today has none — and most have
been through setup by the only route there was, the company form. Without this
a dev database, a beta tester's install from before this migration, and every
test fixture would be sent to the wizard forever.

The rule: an organization that owns a company has done the setup this wizard
now guides, and is stamped with its own creation time — a date that is at
least not a lie. One with no company has not, and is left for the wizard.

Data-only; the downgrade clears the stamps it set and nothing else, which it
tells apart by the value it chose.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7c41e9d5f02"
down_revision: str | Sequence[str] | None = "f3a9d2c7b815"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        sa.text(
            "UPDATE organizations SET onboarding_completed_at = created_at "
            "WHERE onboarding_completed_at IS NULL "
            "AND id IN (SELECT organization_id FROM companies)"
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        sa.text(
            "UPDATE organizations SET onboarding_completed_at = NULL "
            "WHERE onboarding_completed_at = created_at"
        )
    )
