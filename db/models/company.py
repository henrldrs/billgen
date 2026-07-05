from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from ._base import Base, TenantRowMixin


class CompanyRow(TenantRowMixin, Base):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    legal_name: Mapped[str | None] = mapped_column(String(200))

    vat_number: Mapped[str | None] = mapped_column(String(32))
    registration_number: Mapped[str | None] = mapped_column(String(64))

    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(32))

    address_line1: Mapped[str | None] = mapped_column(String(255))
    address_line2: Mapped[str | None] = mapped_column(String(255))
    postal_code: Mapped[str | None] = mapped_column(String(16))
    city: Mapped[str | None] = mapped_column(String(100))
    country_code: Mapped[str] = mapped_column(String(2), nullable=False, default="BE")

    iban: Mapped[str | None] = mapped_column(String(34))
    bic: Mapped[str | None] = mapped_column(String(11))

    logo_key: Mapped[str | None] = mapped_column(String(512))

    default_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    default_language: Mapped[str] = mapped_column(String(2), nullable=False, default="fr")
    default_pdf_template: Mapped[str] = mapped_column(
        String(64), nullable=False, default="fr_standard"
    )
    invoice_reference_prefix: Mapped[str] = mapped_column(String(8), nullable=False, default="")
