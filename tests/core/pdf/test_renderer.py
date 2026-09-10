"""The PDF engine is Chromium, reached two ways: the Edge every Windows machine
already has, printed from its own command line (T-21), or Playwright's build in
the container. These pin the wiring between the two without needing either —
and the last one prints through the real Edge when there is one."""

import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import url2pathname

import pytest

from core.pdf import PdfEngineUnavailableError, html_to_pdf, renderer

HTML = "<html><body>Facture n° 1 — épreuve €</body></html>"


# ── Finding the browser ─────────────────────────────────────────────────────


def test_the_override_is_the_whole_answer(tmp_path, monkeypatch):
    fake = tmp_path / "browser.exe"
    fake.write_bytes(b"")
    monkeypatch.setenv("BILLGEN_PDF_BROWSER", str(fake))
    assert renderer._edge_executable() == fake

    # A path that does not exist means "no browser" — never "some other one".
    monkeypatch.setenv("BILLGEN_PDF_BROWSER", str(tmp_path / "missing.exe"))
    assert renderer._edge_executable() is None


def test_off_windows_nothing_is_looked_for(monkeypatch):
    monkeypatch.delenv("BILLGEN_PDF_BROWSER", raising=False)
    monkeypatch.setattr(sys, "platform", "linux")
    assert list(renderer._edge_candidates()) == []


@pytest.mark.skipif(sys.platform != "win32", reason="Edge ships with Windows")
def test_windows_finds_its_edge(monkeypatch):
    monkeypatch.delenv("BILLGEN_PDF_BROWSER", raising=False)
    edge = renderer._edge_executable()
    assert edge is not None
    assert edge.name.lower() == "msedge.exe"


# ── The command line ────────────────────────────────────────────────────────


def test_the_command_prints_headless_on_its_own_profile_without_a_header(tmp_path):
    source = tmp_path / "document.html"
    output = tmp_path / "document.pdf"
    profile = tmp_path / "profile"
    argv = renderer._edge_command(Path("msedge.exe"), source, output, profile)

    assert argv[0] == "msedge.exe"
    assert "--headless" in argv
    assert "--no-pdf-header-footer" in argv
    assert f"--print-to-pdf={output}" in argv
    assert f"--user-data-dir={profile}" in argv
    assert argv[-1] == source.as_uri()
    assert argv[-1].startswith("file:///")


def _fake_browser(writes: bytes | None):
    """A stand-in for `subprocess.run` that does what Edge does: opens the file
    it was pointed at and writes a PDF where `--print-to-pdf=` says."""
    seen: dict = {}

    def run(argv, **kwargs):
        seen["argv"] = argv
        seen["source"] = Path(url2pathname(urlparse(argv[-1]).path))
        seen["html"] = seen["source"].read_text(encoding="utf-8-sig")
        output = next(a for a in argv if a.startswith("--print-to-pdf="))
        if writes is not None:
            Path(output.removeprefix("--print-to-pdf=")).write_bytes(writes)
        return subprocess.CompletedProcess(argv, 0, b"", b"")

    return run, seen


def test_edge_gets_the_document_and_its_pdf_comes_back(monkeypatch):
    run, seen = _fake_browser(b"%PDF-1.7 fake")
    monkeypatch.setattr(subprocess, "run", run)

    assert renderer._edge_pdf(HTML, Path("msedge.exe")) == b"%PDF-1.7 fake"
    assert seen["html"] == HTML
    # The working directory, profile included, leaves with the render.
    assert not seen["source"].exists()


def test_a_browser_that_writes_nothing_fails_the_render(monkeypatch):
    run, _seen = _fake_browser(None)
    monkeypatch.setattr(subprocess, "run", run)
    with pytest.raises(RuntimeError, match="wrote no PDF"):
        renderer._edge_pdf(HTML, Path("msedge.exe"))


def test_a_browser_that_exits_badly_reports_its_last_line(monkeypatch):
    def run(argv, **kwargs):
        raise subprocess.CalledProcessError(
            21, argv, output=b"", stderr=b"noise\nthe real reason\n"
        )

    monkeypatch.setattr(subprocess, "run", run)
    with pytest.raises(RuntimeError, match="exit status 21: the real reason"):
        renderer._edge_pdf(HTML, Path("msedge.exe"))


# ── Which launcher, in which order ──────────────────────────────────────────


def test_edge_first_and_playwright_not_at_all(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(renderer, "_edge_executable", lambda: Path("msedge.exe"))
    monkeypatch.setattr(
        renderer, "_edge_pdf", lambda html, exe: calls.append("edge") or b"%PDF-edge"
    )
    monkeypatch.setattr(
        renderer, "_chromium_pdf", lambda html: calls.append("playwright") or b"%PDF-pw"
    )
    assert html_to_pdf(HTML) == b"%PDF-edge"
    assert calls == ["edge"]


def test_playwright_covers_an_edge_that_fails(monkeypatch):
    def broken(html, exe):
        raise RuntimeError("exit status 1: boom")

    monkeypatch.setattr(renderer, "_edge_executable", lambda: Path("msedge.exe"))
    monkeypatch.setattr(renderer, "_edge_pdf", broken)
    monkeypatch.setattr(renderer, "_chromium_pdf", lambda html: b"%PDF-pw")
    assert html_to_pdf(HTML) == b"%PDF-pw"


def test_without_edge_playwright_is_the_only_attempt(monkeypatch):
    monkeypatch.setattr(renderer, "_edge_executable", lambda: None)
    monkeypatch.setattr(
        renderer, "_edge_pdf", lambda html, exe: pytest.fail("there is no Edge to call")
    )
    monkeypatch.setattr(renderer, "_chromium_pdf", lambda html: b"%PDF-pw")
    assert html_to_pdf(HTML) == b"%PDF-pw"


def test_the_error_names_every_attempt_one_line_each(monkeypatch):
    def broken_edge(html, exe):
        raise RuntimeError("exit status 1: boom")

    def no_playwright(html):
        raise ImportError("No module named 'playwright'\n╔══ a banner ══╗")

    monkeypatch.setattr(renderer, "_edge_executable", lambda: Path("msedge.exe"))
    monkeypatch.setattr(renderer, "_edge_pdf", broken_edge)
    monkeypatch.setattr(renderer, "_chromium_pdf", no_playwright)

    with pytest.raises(PdfEngineUnavailableError) as info:
        html_to_pdf(HTML)
    message = str(info.value)
    assert "msedge.exe: exit status 1: boom" in message
    assert "_chromium_pdf: No module named 'playwright'" in message
    assert "banner" not in message


# ── What keeps the two launchers printing the same page ─────────────────────

_PAGE_RULE = re.compile(r"@page\s*\{[^}]*\bsize\s*:[^}]*\bmargin\s*:[^}]*\}")


def test_every_template_declares_its_own_page():
    """Neither launcher is told the paper: Edge's command line has no switch
    for it, and Playwright is told to prefer the CSS. A template that left
    size or margin to a launcher default would print differently on each."""
    templates = sorted(renderer._TEMPLATES_DIR.glob("*.j2"))
    assert templates  # the guard must be looking at something
    for path in templates:
        assert _PAGE_RULE.search(path.read_text(encoding="utf-8")), path.name


# ── The real thing ──────────────────────────────────────────────────────────


@pytest.mark.skipif(renderer._edge_executable() is None, reason="No Edge on this machine")
def test_edge_prints_real_bytes():
    """T-21's assertion with Playwright out of the picture by construction:
    `_edge_pdf` imports nothing and downloads nothing."""
    pdf = renderer._edge_pdf(HTML, renderer._edge_executable())
    assert pdf.startswith(b"%PDF")
