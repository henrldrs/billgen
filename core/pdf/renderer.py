import os
import subprocess
import sys
import tempfile
from collections.abc import Iterator
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

_TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(enabled_extensions=("html", "j2")),
)


class PdfEngineUnavailableError(RuntimeError):
    """The HTML->PDF engine is not usable. HTML rendering still works everywhere;
    only the HTML->PDF byte step needs an engine.

    The engine is headless Chromium, reached one of two ways. On Windows the
    Edge every machine already has prints the page from its own command line —
    no download, no Python dependency (T-21). In the container it is
    Playwright's Chromium: ``pip install playwright`` then
    ``python -m playwright install chromium``. There is deliberately no second
    engine: two engines mean one invoice with two appearances, and only one of
    them was ever looked at. Edge *is* Chromium, so both paths draw the same
    document; the page geometry lives in each template's ``@page`` rule so that
    neither launcher has to be told it."""


def render_html(template_filename: str, context: dict) -> str:
    return _env.get_template(template_filename).render(**context)


# ── The installed Edge, from its own command line ──────────────────────────

# `BILLGEN_PDF_BROWSER` names a Chromium-family executable explicitly. Set, it
# is the whole answer: a path that does not exist means "no browser", never
# "some other browser".
_BROWSER_OVERRIDE = "BILLGEN_PDF_BROWSER"

# A render is one process launch on a fresh profile, so this is mostly Edge's
# own start-up; the probe on the development laptop takes about three seconds.
_EDGE_TIMEOUT_S = 60


def _edge_candidates() -> Iterator[Path]:
    """Where a browser might be, most authoritative first. Only the override is
    consulted off Windows: Edge is the answer *because* Windows 11 ships it."""
    override = os.environ.get(_BROWSER_OVERRIDE)
    if override:
        yield Path(override)
        return
    if sys.platform != "win32":
        return

    import winreg  # noqa: PLC0415 — Windows-only module

    # The installer registers itself here, wherever it put the binary.
    app_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"
    for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
        try:
            with winreg.OpenKey(hive, app_path) as key:
                value, _kind = winreg.QueryValueEx(key, None)
        except OSError:
            continue
        if value:
            yield Path(value)

    # The usual locations, should the registration be missing.
    for base in ("PROGRAMFILES(X86)", "PROGRAMFILES", "LOCALAPPDATA"):
        root = os.environ.get(base)
        if root:
            yield Path(root) / "Microsoft" / "Edge" / "Application" / "msedge.exe"


def _edge_executable() -> Path | None:
    return next((path for path in _edge_candidates() if path.is_file()), None)


def _edge_command(executable: Path, source: Path, output: Path, profile: Path) -> list[str]:
    return [
        str(executable),
        "--headless",
        # Historically required for headless printing on Windows; harmless now.
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-sync",
        # A profile of its own, per render. Without one Edge hands the command
        # to any instance already running on the user's profile — which prints
        # nothing and returns at once — and two renders at a time would do the
        # same to each other.
        f"--user-data-dir={profile}",
        # Chromium 109 (2023) and later; before that the switch was
        # --print-to-pdf-no-header.
        "--no-pdf-header-footer",
        f"--print-to-pdf={output}",
        source.as_uri(),
    ]


def _edge_pdf(html: str, executable: Path) -> bytes:
    """Print through the installed browser. Backgrounds print, `@page` governs
    size and margins, and no header or footer is added — verified against
    Edge 152, which is what the templates' `@page` rules assume."""
    # `ignore_cleanup_errors`: Edge can hold a profile file open for a moment
    # after the browser process has exited, and a stray temporary directory is
    # not worth failing a render over.
    with tempfile.TemporaryDirectory(
        prefix="billgen-pdf-", ignore_cleanup_errors=True
    ) as directory:
        work = Path(directory)
        source = work / "document.html"
        output = work / "document.pdf"
        # A byte-order mark settles the encoding before any sniffing, whether or
        # not the document carries a charset of its own.
        source.write_text(html, encoding="utf-8-sig")

        try:
            subprocess.run(
                _edge_command(executable, source, output, work / "profile"),
                check=True,
                capture_output=True,
                timeout=_EDGE_TIMEOUT_S,
                # No console window from a packaged sidecar (a no-op off Windows).
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except subprocess.CalledProcessError as exc:
            stderr = exc.stderr.decode(errors="replace").strip().splitlines()
            detail = stderr[-1] if stderr else "no output"
            raise RuntimeError(f"exit status {exc.returncode}: {detail}") from exc

        if not output.is_file():
            raise RuntimeError("exited cleanly and wrote no PDF")
        pdf = output.read_bytes()
        if not pdf.startswith(b"%PDF"):
            raise RuntimeError("wrote a file that is not a PDF")
        return pdf


# ── Playwright's Chromium, for the container ───────────────────────────────

# Repo-local browser cache (gitignored). Preferred over Playwright's default
# %LOCALAPPDATA%\ms-playwright because AppData is subject to MSIX filesystem
# virtualization: a sandboxed process (e.g. an installer run from a Store-
# packaged app) can populate a shadow copy there that other processes never
# see. A cache inside the project tree is one real directory for everyone.
_LOCAL_BROWSERS_DIR = Path(__file__).resolve().parents[2] / "var" / "pw-browsers"


def _chromium_pdf(html: str) -> bytes:
    """Render via Playwright's headless Chromium. Runs synchronously; safe
    inside FastAPI's threadpool (sync route handlers run off the event-loop
    thread)."""
    import asyncio  # noqa: PLC0415 — lazy

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
                # The template's `@page` rule decides the paper, exactly as it
                # does when Edge prints the same document from its command line.
                return await page.pdf(
                    format="A4",
                    prefer_css_page_size=True,
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


def _first_line(exc: BaseException) -> str:
    # First line only: Playwright appends a multi-line box-drawing banner that
    # bloats logs and chokes legacy console codepages.
    text = str(exc)
    return text.splitlines()[0] if text else repr(exc)


def html_to_pdf(html: str) -> bytes:
    """Render through Chromium — the installed Edge where there is one,
    Playwright's build otherwise. Raise PdfEngineUnavailableError naming every
    attempt if none of them could (the API maps that to 503)."""
    failures: list[str] = []
    last: BaseException | None = None

    edge = _edge_executable()
    if edge is not None:
        try:
            return _edge_pdf(html, edge)
        except Exception as exc:  # launch failure, timeout, no file written
            failures.append(f"{edge.name}: {_first_line(exc)}")
            last = exc

    try:
        return _chromium_pdf(html)
    except Exception as exc:  # ImportError, missing browser, launch failure
        failures.append(f"_chromium_pdf: {_first_line(exc)}")
        last = exc

    raise PdfEngineUnavailableError("; ".join(failures)) from last
