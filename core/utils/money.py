from decimal import Decimal

from ..models import Currency

_SYMBOLS: dict[Currency, str] = {
    Currency.EUR: "€",
    Currency.USD: "$",
    Currency.GBP: "£",
    Currency.JPY: "¥",
    Currency.CAD: "$",
    Currency.AUD: "$",
}

_NBSP = " "


def _group(digits: str, sep: str) -> str:
    out: list[str] = []
    while len(digits) > 3:
        out.insert(0, digits[-3:])
        digits = digits[:-3]
    out.insert(0, digits)
    return sep.join(out)


def format_amount(amount: Decimal, currency: Currency, lang: str = "fr") -> str:
    """Locale-formatted money string for PDFs and UI exports.

    fr/es: 1 512,50 € · nl: € 1.512,50 · en: €1,512.50
    """
    quantized = amount.quantize(Decimal(10) ** -currency.decimals)
    sign = "-" if quantized < 0 else ""
    text = str(abs(quantized))
    int_part, _, frac_part = text.partition(".")
    symbol = _SYMBOLS[currency]

    if lang == "en":
        num = _group(int_part, ",") + (f".{frac_part}" if frac_part else "")
        return f"{sign}{symbol}{num}"
    if lang == "nl":
        num = _group(int_part, ".") + (f",{frac_part}" if frac_part else "")
        return f"{sign}{symbol}{_NBSP}{num}"
    if lang == "es":
        num = _group(int_part, ".") + (f",{frac_part}" if frac_part else "")
        return f"{sign}{num}{_NBSP}{symbol}"
    # fr (default)
    num = _group(int_part, _NBSP) + (f",{frac_part}" if frac_part else "")
    return f"{sign}{num}{_NBSP}{symbol}"
