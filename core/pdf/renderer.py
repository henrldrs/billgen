from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(enabled_extensions=("html", "j2")),
)


class PdfEngineUnavailableError(RuntimeError):
    """No HTML->PDF engine is usable. HTML rendering still works everywhere; only
    the HTML->PDF byte step needs an engine.

    Primary engine is headless Chromium via Playwright (cross-platform, renders
    the templates pixel-perfect, bundles into the desktop .exe). Install with:
    ``pip install playwright`` then ``python -m playwright install chromium``.
    WeasyPrint (GTK/Pango) is kept as a fallback for the Docker/SaaS image."""


def render_html(template_filename: str, context: dict) -> str:
    return _env.get_template(template_filename).render(**context)


def _chromium_pdf(html: str) -> bytes:
    """Render via headless Chromium. Runs synchronously; safe inside FastAPI's
    threadpool (sync route handlers run off the event-loop thread)."""
    from playwright.sync_api import sync_playwright  # noqa: PLC0415 — lazy

    # --no-sandbox: required when the SaaS container runs Chromium as root; a
    # no-op on Windows/desktop.
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            return page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )
        finally:
            browser.close()


def _weasyprint_pdf(html: str) -> bytes:
    from weasyprint import HTML  # noqa: PLC0415 — deliberate lazy import

    return HTML(string=html).write_pdf()


def html_to_pdf(html: str) -> bytes:
    """Try Chromium first, then WeasyPrint. Raise PdfEngineUnavailableError only
    if neither engine can render (the API maps that to 503)."""
    errors: list[str] = []
    for engine in (_chromium_pdf, _weasyprint_pdf):
        try:
            return engine(html)
        except Exception as exc:  # ImportError, missing browser, missing native libs
            errors.append(f"{engine.__name__}: {exc}")
    raise PdfEngineUnavailableError("; ".join(errors))
