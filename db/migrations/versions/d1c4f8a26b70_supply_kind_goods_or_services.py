"""supply kind — goods or services, on the catalogue and on every line

Revision ID: d1c4f8a26b70
Revises: a40b35409ffe
Create Date: 2026-09-09 18:40:00.000000

The fiscal distinction, not a catalogue label. Existing rows become
'services': that is what the code assumed before the column existed, so every
document already issued keeps the treatment it was issued with.

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1c4f8a26b70"
down_revision: str | Sequence[str] | None = "a40b35409ffe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLES = ("products", "invoice_lines", "credit_note_lines", "quote_lines")


def upgrade() -> None:
    """Upgrade schema."""
    for table in _TABLES:
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "supply_kind",
                    sa.String(length=10),
                    nullable=False,
                    server_default="services",
                )
            )


def downgrade() -> None:
    """Downgrade schema."""
    for table in reversed(_TABLES):
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.drop_column("supply_kind")
