from ..models import VATCategory

# Mandatory legal mentions per VAT category. Belgian references: Code TVA (CTVA) /
# Wetboek BTW (W.BTW). A licensed Belgian accountant should sign off on final wording
# before public launch — the audit's finding on this in ch. 06 stands.
_MENTIONS: dict[VATCategory, dict[str, str]] = {
    VATCategory.REVERSE_CHARGE: {
        "fr": "Autoliquidation — Article 51, §2, 5° du Code de la TVA",
        "nl": "BTW verlegd — Artikel 51, §2, 5° W.BTW",
        "en": "Reverse charge — VAT payable by the recipient",
        "es": "Inversión del sujeto pasivo — Art. 51 §2 CTVA",
    },
    VATCategory.INTRA_EU: {
        "fr": "Livraison intracommunautaire exemptée — Article 39bis CTVA",
        "nl": "Intracommunautaire levering vrijgesteld — Artikel 39bis W.BTW",
        "en": "Intra-Community supply exempt — Art. 39bis CTVA",
        "es": "Entrega intracomunitaria exenta — Art. 39bis CTVA",
    },
    VATCategory.EXPORT: {
        "fr": "Exportation exemptée — Article 39, §1 CTVA",
        "nl": "Export vrijgesteld — Artikel 39, §1 W.BTW",
        "en": "Export exempt — Art. 39 §1 CTVA",
        "es": "Exportación exenta — Art. 39 §1 CTVA",
    },
    VATCategory.EXEMPT: {
        "fr": "Opération exemptée de TVA",
        "nl": "Handeling vrijgesteld van BTW",
        "en": "VAT exempt transaction",
        "es": "Operación exenta de IVA",
    },
}


def legal_mention_for(category: VATCategory, lang: str = "fr") -> str | None:
    """Return the mandatory legal mention for `category` in `lang`.

    Falls back to French if the requested language is not registered; returns
    None if the category has no mandatory mention (STANDARD / ZERO / NOT_SUBJECT).
    """
    mentions = _MENTIONS.get(category)
    if mentions is None:
        return None
    return mentions.get(lang, mentions.get("fr"))


def mandatory_mentions_for_invoice(category: VATCategory, lang: str = "fr") -> list[str]:
    """List of mandatory legal mentions to print on an invoice with this VAT category."""
    mention = legal_mention_for(category, lang)
    return [mention] if mention else []
