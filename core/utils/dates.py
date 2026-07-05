from datetime import date


def format_date(value: date, lang: str = "fr") -> str:
    """fr/nl/es: dd/mm/YYYY · en: YYYY-MM-DD (ISO)."""
    if lang == "en":
        return value.isoformat()
    return value.strftime("%d/%m/%Y")
