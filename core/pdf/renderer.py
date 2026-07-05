from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(enabled_extensions=("html", "j2")),
)


class PdfEngineUnavailableError(RuntimeError):
    """WeasyPrint (or its native Pango/GObject dependencies) is not installed.

    HTML rendering still works everywhere; only the HTML->PDF conversion needs
    the native stack. On Windows dev boxes this typically means installing
    GTK3 runtime libraries; the Docker API image ships them."""


def render_html(template_filename: str, context: dict) -> str:
    return _env.get_template(template_filename).render(**context)


def html_to_pdf(html: str) -> bytes:
    try:
        from weasyprint import HTML  # noqa: PLC0415 — deliberate lazy import
    except Exception as exc:  # ImportError or OSError from missing native libs
        raise PdfEngineUnavailableError(str(exc)) from exc
    return HTML(string=html).write_pdf()
