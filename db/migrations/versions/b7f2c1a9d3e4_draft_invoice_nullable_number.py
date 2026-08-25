"""draft invoices: nullable reference + sequence_global

A DRAFT invoice has no gapless number yet (ADR-0002); the number is consumed
only at issue(). Relax the NOT NULL on invoices.reference / sequence_global so a
draft can be stored without one. The (organization_id, company_id, reference) and
(organization_id, company_id, sequence_global) unique constraints are preserved:
SQL treats NULLs as distinct, so many drafts coexist while issued rows stay unique.

Revision ID: b7f2c1a9d3e4
Revises: 6cca38efdaf1
Create Date: 2026-07-07 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7f2c1a9d3e4'
down_revision: str | Sequence[str] | None = '6cca38efdaf1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.alter_column(
            'reference', existing_type=sa.String(length=64), nullable=True
        )
        batch_op.alter_column(
            'sequence_global', existing_type=sa.Integer(), nullable=True
        )


def downgrade() -> None:
    """Downgrade schema.

    Requires no drafts to exist (their NULL number cannot satisfy NOT NULL).
    """
    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.alter_column(
            'sequence_global', existing_type=sa.Integer(), nullable=False
        )
        batch_op.alter_column(
            'reference', existing_type=sa.String(length=64), nullable=False
        )
