from decimal import Decimal

from pydantic import BaseModel


class KpiResponse(BaseModel):
    invoiced_total: Decimal
    paid_total: Decimal
    outstanding_total: Decimal
    counts: dict[str, int]
    overdue_count: int


class RevenueByMonthResponse(BaseModel):
    year: int
    months: dict[int, Decimal]
