import os
import subprocess
import sys
import tempfile
import time
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

# How long to keep waiting for the PDF *after* the launcher has returned.
#
# When an Edge is already running in the background — and on Windows 11 one
# usually is: "startup boost" keeps a windowless `msedge.exe --no-startup-window`
# alive from logon — a headless launch does not render. It hands the print job
# to that instance and exits in a tenth of a second, and the PDF lands about a
# second later, written by a process this code never started. A private
# `--user-data-dir` does not prevent the hand-off (measured 2026-09-11, Edge
# 152.0.4191.66: every variant tried, startup boost disabled included, handed
# off the same way); it only stops the job being dropped. So the launcher's
# return says nothing, and the file is what is waited for. Without a
# background instance the launcher blocks until the file exists and this wait
# costs one poll.
_EDGE_HANDOFF_WAIT_S = 30
_EDGE_POLL_S = 0.1


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
        # A profile of its own, per render. Without one, a job handed to the
        # instance already running on the user's profile prints nothing, and
        # two renders at a time would do the same to each other. It does NOT
        # stop the hand-off itself — see _EDGE_HANDOFF_WAIT_S for what does.
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

        pdf = _wait_for_pdf(output, _EDGE_HANDOFF_WAIT_S)
        if pdf is None:
            raise RuntimeError(
                f"exited cleanly and wrote no PDF within {_EDGE_HANDOFF_WAIT_S:g}s — "
                "an Edge already running in the background took the print job "
                "and did not finish it"
            )
        if not pdf.startswith(b"%PDF"):
            raise RuntimeError("wrote a file that is not a PDF")
        return pdf


def _wait_for_pdf(output: Path, wait_s: float) -> bytes | None:
    """The PDF once it is whole, or None when `wait_s` passes with no file.

    The writer is a process this code did not start and cannot join, so
    "whole" has to be read off the file: non-empty, the same size on two
    consecutive polls, and ending in the `%%EOF` trailer the PDF format puts
    last. Size alone is not enough — a writer that pauses mid-file looks
    stable for a poll or two. At the deadline a non-empty file is returned
    as it is rather than refused: the trailer is a reason to keep waiting,
    not a reason to throw a PDF away.
    """
    deadline = time.monotonic() + wait_s
    last_size = -1
    while True:
        size = output.stat().st_size if output.is_file() else 0
        if size > 0 and size == last_size and _ends_like_a_pdf(output):
            return output.read_bytes()
        last_size = size
        if time.monotonic() >= deadline:
            return output.read_bytes() if size > 0 else None
        time.sleep(_EDGE_POLL_S)


def _ends_like_a_pdf(output: Path) -> bool:
    try:
        with output.open("rb") as handle:
            handle.seek(0, os.SEEK_END)
            handle.seek(max(handle.tell() - 16, 0))
            return handle.read().rstrip().endswith(b"%%EOF")
    except OSError:
        return False


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
