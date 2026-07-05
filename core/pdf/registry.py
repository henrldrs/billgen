from dataclasses import dataclass


class UnknownTemplateError(KeyError):
    """Requested PDF template id is not registered."""


@dataclass(frozen=True)
class TemplateSpec:
    id: str
    filename: str
    lang: str
    doc_title: str


TEMPLATES: dict[str, TemplateSpec] = {
    spec.id: spec
    for spec in (
        TemplateSpec("fr_standard", "fr_standard.html.j2", "fr", "FACTURE"),
        TemplateSpec("fr_detailed", "fr_detailed.html.j2", "fr", "FACTURE"),
        TemplateSpec("nl_minimal", "nl_minimal.html.j2", "nl", "FACTUUR"),
        TemplateSpec("credit_note", "credit_note.html.j2", "fr", "NOTE DE CRÉDIT"),
    )
}


def get_template(template_id: str) -> TemplateSpec:
    try:
        return TEMPLATES[template_id]
    except KeyError:
        raise UnknownTemplateError(template_id) from None
