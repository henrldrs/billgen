"""onboarding state on the organization, and the legal acceptances that gate it

Revision ID: f3a9d2c7b815
Revises: e2f7c9b41a55
Create Date: 2026-09-11 12:00:00.000000

T-29. `onboarding_completed_at` is what makes "the first run shows once" a
fact rather than a browser flag — a reinstall, a second machine or a cleared
cache all read the same column. `legal_acceptances` is the per-user,
per-version record the legal registry has asked for since it was written.

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f3a9d2c7b815"
down_revision: str | Sequence[str] | None = "e2f7c9b41a55"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("organizations", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True)
        )

    op.create_table(
        "legal_acceptances",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("document_key", sa.String(length=32), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"],
            name="fk_legal_acceptances_organization_id_organizations",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_legal_acceptances_user_id_users"
        ),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"],
            name="fk_legal_acceptances_document_id_documents",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_legal_acceptances"),
        #  In the CREATE: SQLite cannot ALTER a constraint in afterwards.
        sa.UniqueConstraint(
            "organization_id", "user_id", "document_key", "version",
            name="uq_legal_acceptances_user_document_version",
        ),
    )
    op.create_index(
        "ix_legal_acceptances_organization_id", "legal_acceptances", ["organization_id"]
    )
    op.create_index("ix_legal_acceptances_user_id", "legal_acceptances", ["user_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_legal_acceptances_user_id", table_name="legal_acceptances")
    op.drop_index("ix_legal_acceptances_organization_id", table_name="legal_acceptances")
    op.drop_table("legal_acceptances")
    with op.batch_alter_table("organizations", schema=None) as batch_op:
        batch_op.drop_column("onboarding_completed_at")
