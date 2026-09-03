"""The DDL PostgreSQL will actually see, checked on a machine that has no Postgres.

`invoices` and `credit_notes` once declared two unique constraints each whose
first column was `organization_id`. The `uq` naming convention keys off the
first column only, so both came out under one name — which SQLite accepts and
PostgreSQL refuses outright, at `create_all` in the CI Postgres leg and at the
initial migration on the first real deployment.

The fix was to name those constraints explicitly. This guard is what stops the
next pair from re-introducing it: development and the test suite run on SQLite,
so nothing else here would notice.
"""

import re
from collections import Counter

from sqlalchemy import Column, Integer, MetaData, Table, UniqueConstraint
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from db.models._base import NAMING_CONVENTION, Base

_CONSTRAINT_NAME = re.compile(r"CONSTRAINT\s+(\S+)\s", re.IGNORECASE)


def _postgres_ddl(table) -> str:
    return str(CreateTable(table).compile(dialect=postgresql.dialect()))


def _duplicate_constraint_names(table) -> dict[str, int]:
    names = Counter(_CONSTRAINT_NAME.findall(_postgres_ddl(table)))
    return {name: count for name, count in names.items() if count > 1}


def test_no_table_emits_two_constraints_under_one_name():
    offenders = {
        name: dupes
        for name, table in sorted(Base.metadata.tables.items())
        if (dupes := _duplicate_constraint_names(table))
    }
    assert not offenders, (
        "PostgreSQL rejects a CREATE TABLE carrying two constraints of the same "
        f"name; name them explicitly: {offenders}"
    )


def test_the_guard_catches_the_bug_it_was_written_for():
    # Without this, a regex that silently matched nothing would pass forever.
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    table = Table(
        "reintroduced",
        metadata,
        Column("organization_id", Integer),
        Column("reference", Integer),
        Column("sequence_global", Integer),
        UniqueConstraint("organization_id", "reference"),
        UniqueConstraint("organization_id", "sequence_global"),
    )
    assert _duplicate_constraint_names(table) == {"uq_reintroduced_organization_id": 2}
