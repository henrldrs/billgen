"""quotes: their own numbering series

Two tables, mirroring invoices/invoice_lines. What differs, and why:

- `reference` and `sequence_global` are NOT NULL. An invoice draft has neither
  until issue() consumes the gapless number (ADR-0002); a quote is numbered at
  creation, because its series carries no gapless obligation to protect.
- The counter lives in `sequences` under scope 'quote', alongside 'invoice' and
  'credit_note'. No schema change is needed for it — that table is already
  keyed by (organization, company, scope).
- `converted_invoice_id` has no FK, for the same reason
  `invoices.voided_by_credit_note_id` has none: a circular pair between quotes
  and invoices complicates inserts and SQLite batch migrations.

The unique constraints are named explicitly. Left to the "uq" convention, which
keys off the first column only, both would come out `uq_quotes_organization_id`
— which SQLite tolerates and PostgreSQL refuses. See the note in the initial
migration, where the same collision was fixed for invoices and credit notes.

Revision ID: 165748c8c55f
Revises: c4e1a7b20f38
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "165748c8c55f"
down_revision: str | Sequence[str] | None = "c4e1a7b20f38"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "quotes",
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("reference", sa.String(length=64), nullable=False),
        sa.Column("sequence_global", sa.Integer(), nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("quote_discount_type", sa.String(length=20), nullable=True),
        sa.Column("quote_discount_value", sa.Numeric(precision=18, scale=6), nullable=True),
        sa.Column("quote_discount_reason", sa.String(length=255), nullable=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("terms", sa.Text(), nullable=True),
        sa.Column("pdf_template", sa.String(length=64), nullable=False),
        sa.Column("subtotal_ht", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("total_discount", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("total_vat", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("total_ttc", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("converted_invoice_id", sa.Uuid(), nullable=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"], ["clients.id"], name=op.f("fk_quotes_client_id_clients")
        ),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_quotes_company_id_companies")
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_quotes_organization_id_organizations"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quotes")),
        sa.UniqueConstraint(
            "organization_id", "company_id", "reference", name=op.f("uq_quotes_reference")
        ),
        sa.UniqueConstraint(
            "organization_id",
            "company_id",
            "sequence_global",
            name=op.f("uq_quotes_sequence_global"),
        ),
    )
    with op.batch_alter_table("quotes", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_quotes_client_id"), ["client_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_quotes_company_id"), ["company_id"], unique=False)
        batch_op.create_index(
            batch_op.f("ix_quotes_organization_id"), ["organization_id"], unique=False
        )

    op.create_table(
        "quote_lines",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("quote_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=True),
        sa.Column("vat_category", sa.String(length=2), nullable=False),
        sa.Column("vat_rate", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("vat_legal_mention", sa.Text(), nullable=True),
        sa.Column("discount_type", sa.String(length=20), nullable=True),
        sa.Column("discount_value", sa.Numeric(precision=18, scale=6), nullable=True),
        sa.Column("discount_reason", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_quote_lines_organization_id_organizations"),
        ),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quotes.id"],
            name=op.f("fk_quote_lines_quote_id_quotes"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quote_lines")),
    )
    with op.batch_alter_table("quote_lines", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_quote_lines_organization_id"), ["organization_id"], unique=False
        )
        batch_op.create_index(batch_op.f("ix_quote_lines_quote_id"), ["quote_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("quote_lines", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_quote_lines_quote_id"))
        batch_op.drop_index(batch_op.f("ix_quote_lines_organization_id"))
    op.drop_table("quote_lines")

    with op.batch_alter_table("quotes", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_quotes_organization_id"))
        batch_op.drop_index(batch_op.f("ix_quotes_company_id"))
        batch_op.drop_index(batch_op.f("ix_quotes_client_id"))
    op.drop_table("quotes")
