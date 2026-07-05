from enum import Enum


class Currency(str, Enum):
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"
    JPY = "JPY"
    CAD = "CAD"
    AUD = "AUD"

    @property
    def decimals(self) -> int:
        return 0 if self is Currency.JPY else 2
