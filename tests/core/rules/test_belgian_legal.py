from core.models import VATCategory
from core.rules import legal_mention_for, mandatory_mentions_for_invoice


def test_reverse_charge_french():
    mention = legal_mention_for(VATCategory.REVERSE_CHARGE, "fr")
    assert mention is not None
    assert "Autoliquidation" in mention


def test_reverse_charge_dutch():
    mention = legal_mention_for(VATCategory.REVERSE_CHARGE, "nl")
    assert mention is not None
    assert "verlegd" in mention


def test_reverse_charge_english():
    mention = legal_mention_for(VATCategory.REVERSE_CHARGE, "en")
    assert mention is not None
    assert "Reverse charge" in mention


def test_intra_eu_french_mentions_39bis():
    mention = legal_mention_for(VATCategory.INTRA_EU, "fr")
    assert mention is not None
    assert "39bis" in mention


def test_export_french_mentions_article_39():
    mention = legal_mention_for(VATCategory.EXPORT, "fr")
    assert mention is not None
    assert "39" in mention


def test_unknown_language_falls_back_to_french():
    mention = legal_mention_for(VATCategory.REVERSE_CHARGE, "de")
    fr = legal_mention_for(VATCategory.REVERSE_CHARGE, "fr")
    assert mention == fr


def test_standard_category_has_no_mandatory_mention():
    assert legal_mention_for(VATCategory.STANDARD) is None
    assert mandatory_mentions_for_invoice(VATCategory.STANDARD) == []


def test_mandatory_mentions_for_reverse_charge_returns_one():
    mentions = mandatory_mentions_for_invoice(VATCategory.REVERSE_CHARGE, "fr")
    assert len(mentions) == 1
