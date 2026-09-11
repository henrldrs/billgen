"""consent records — the decisions core/trust/consent.py shaped and nothing kept

Revision ID: b8d2f6a1c930
Revises: a7c41e9d5f02
Create Date: 2026-09-11 15:00:00.000000

T-35. Append-only: a change of mind is a new row. Retained on erasure, as the
personal-data register says — a consent record is the proof a choice was made.

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8d2f6a1c930"
down_revision: str | Sequence[str] | None = "a7c41e9d5f02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "consent_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("policy_version", sa.String(length=32), nullable=False),
        sa.Column("state", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"],
            name="fk_consent_records_organization_id_organizations",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_consent_records_user_id_users"),
        sa.PrimaryKeyConstraint("id", name="pk_consent_records"),
    )
    op.create_index("ix_consent_records_organization_id", "consent_records", ["organization_id"])
    op.create_index("ix_consent_records_user_id", "consent_records", ["user_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_consent_records_user_id", table_name="consent_records")
    op.drop_index("ix_consent_records_organization_id", table_name="consent_records")
    op.drop_table("consent_records")
