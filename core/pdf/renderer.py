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


# Repo-local browser cache (gitignored). Preferred over Playwright's default
# %LOCALAPPDATA%\ms-playwright because AppData is subject to MSIX filesystem
# virtualization: a sandboxed process (e.g. an installer run from a Store-
# packaged app) can populate a shadow copy there that other processes never
# see. A cache inside the project tree is one real directory for everyone.
_LOCAL_BROWSERS_DIR = Path(__file__).resolve().parents[2] / "var" / "pw-browsers"


def _chromium_pdf(html: str) -> bytes:
    """Render via headless Chromium. Runs synchronously; safe inside FastAPI's
    threadpool (sync route handlers run off the event-loop thread)."""
    import asyncio  # noqa: PLC0415 — lazy
    import os  # noqa: PLC0415 — lazy
    import sys  # noqa: PLC0415 — lazy

    if "PLAYWRIGHT_BROWSERS_PATH" not in os.environ and _LOCAL_BROWSERS_DIR.is_dir():
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(_LOCAL_BROWSERS_DIR)

    from playwright.async_api import async_playwright  # noqa: PLC0415 — lazy

    async def render() -> bytes:
        # --no-sandbox: required when the SaaS container runs Chromium as root;
        # a no-op on Windows/desktop.
        async with async_playwright() as p:
            try:
                browser = await p.chromium.launch(args=["--no-sandbox"])
            except Exception:
                # Default headless uses the separate headless-shell build; if
                # that download is absent, retry with the full Chromium build.
                browser = await p.chromium.launch(
                    channel="chromium", args=["--no-sandbox"]
                )
            try:
                page = await browser.new_page()
                await page.set_content(html, wait_until="load")
                return await page.pdf(
                    format="A4",
                    print_background=True,
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                )
            finally:
                await browser.close()

    # Playwright launches Chromium as a subprocess, which on Windows only works
    # on a proactor loop. uvicorn sets WindowsSelectorEventLoopPolicy process-
    # wide, so a policy-derived loop (what sync_playwright uses) can't spawn it.
    # Build the loop explicitly instead of trusting the global policy.
    loop_factory = asyncio.ProactorEventLoop if sys.platform == "win32" else None
    with asyncio.Runner(loop_factory=loop_factory) as runner:
        return runner.run(render())


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
            # First line only: Playwright appends a multi-line box-drawing
            # banner that bloats logs and chokes legacy console codepages.
            message = str(exc).splitlines()[0] if str(exc) else repr(exc)
            errors.append(f"{engine.__name__}: {message}")
    raise PdfEngineUnavailableError("; ".join(errors))
