"""documents — the register of files written outside the database

Revision ID: e2f7c9b41a55
Revises: d1c4f8a26b70
Create Date: 2026-09-11 10:00:00.000000

T-27. Issuing an invoice now leaves a PDF on disk; this table records where it
went and what it hashed to. The row is the record and the file is the copy, so
nothing here is ever read to answer a question — see core/models/document.py.

Existing installs get an empty table. `POST /documents/rebuild` is the one-shot
that gives every already-issued invoice its file.

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e2f7c9b41a55"
down_revision: str | Sequence[str] | None = "d1c4f8a26b70"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("path", sa.String(length=512), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("byte_size", sa.BigInteger(), nullable=False),
        sa.Column("target_type", sa.String(length=64), nullable=True),
        sa.Column("target_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"],
            name="fk_documents_organization_id_organizations",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_documents"),
        #  Declared in the CREATE, not added afterwards: SQLite cannot ALTER a
        #  constraint into an existing table, and the desktop is SQLite.
        sa.UniqueConstraint(
            "organization_id", "path", name="uq_documents_organization_id_path"
        ),
    )
    #  One document per path per organization (the UniqueConstraint above):
    #  the path embeds a gapless reference, so a second row on it is two
    #  documents claiming one number.
    op.create_index("ix_documents_organization_id", "documents", ["organization_id"])
    op.create_index("ix_documents_kind", "documents", ["kind"])
    op.create_index("ix_documents_target_type", "documents", ["target_type"])
    op.create_index("ix_documents_target_id", "documents", ["target_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_documents_target_id", table_name="documents")
    op.drop_index("ix_documents_target_type", table_name="documents")
    op.drop_index("ix_documents_kind", table_name="documents")
    op.drop_index("ix_documents_organization_id", table_name="documents")
    op.drop_table("documents")
