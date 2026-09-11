"""What the installer is made of (T-30).

None of this builds anything — `scripts/check_sidecar_runtime.py` is where a
real runtime is exercised, and `tauri build` is Henri's box. These are the
assertions that are cheap enough to run in the ordinary suite and that would
otherwise only fail on the machine furthest from the person who broke them.
"""

import ast
import json
import tomllib
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
TAURI_CONF = REPO / "frontend-electron" / "src-tauri" / "tauri.conf.json"

#  tauri-utils 2.11's `BundleType` deserializer accepts exactly these strings
#  and errors with "unknown bundle target" on anything else — so a typo, or a
#  target someone assumed existed, fails the whole build rather than being
#  ignored. **MSIX is not among them**, which is the finding T-30 turned up:
#  it is not a line of configuration, it is a separate packaging step over the
#  installer Tauri does produce.
TAURI_BUNDLE_TARGETS = {"deb", "rpm", "appimage", "msi", "nsis", "app", "dmg", "all"}


@pytest.fixture(scope="module")
def tauri_config() -> dict:
    return json.loads(TAURI_CONF.read_text(encoding="utf-8"))


def test_every_configured_bundle_target_is_one_tauri_accepts(tauri_config):
    targets = tauri_config["bundle"]["targets"]
    targets = [targets] if isinstance(targets, str) else targets
    unknown = sorted(set(targets) - TAURI_BUNDLE_TARGETS)
    assert not unknown, (
        f"tauri.conf.json asks for {unknown}, which tauri-utils refuses to "
        "deserialize — the build fails before it starts. MSIX in particular is "
        "not a Tauri bundle target; see T-30."
    )


def test_the_sidecar_runtime_is_bundled_as_a_resource(tauri_config):
    """Without this the installer ships a shell with no Python behind it, and
    the failure a customer sees is 'sidecar did not report a port'."""
    assert "runtime/**/*" in tauri_config["bundle"]["resources"]


def test_the_repository_does_not_turn_on_alembic_sourceless_mode():
    """`sourceless = true` belongs in the *packaged* alembic.ini only, written
    there by the build script.

    Turned on in a checkout it makes Alembic read `versions/__pycache__` too,
    so bytecode left behind by a deleted migration returns as a phantom
    revision. That is measured, not feared: it was tried, and
    `a8764bd4120a_drift_check` — long gone from the tree — came back as a
    second head and broke the migration tests immediately.
    """
    text = (REPO / "alembic.ini").read_text(encoding="utf-8")
    active = [
        line
        for line in text.splitlines()
        if line.strip().startswith("sourceless") and not line.strip().startswith("#")
    ]
    assert not active, f"alembic.ini turns on sourceless mode: {active}"


def test_the_build_still_excludes_what_must_not_ship():
    """Playwright is 110 MB of bundled Node driver the desktop stopped needing
    at T-21; psycopg is a Postgres driver a SQLite-only build never imports.
    Both are in the dependency graph, so only this list keeps them out."""
    source = (REPO / "scripts" / "build_sidecar_runtime.py").read_text(encoding="utf-8")
    #  `literal_eval`, not `eval`: this reads a line out of a script, and a
    #  test that executes whatever it finds there is a test that will one day
    #  execute something else.
    excluded: set[str] = set()
    for line in source.splitlines():
        if line.startswith("EXCLUDED = "):
            excluded = ast.literal_eval(line.split("=", 1)[1].strip())
            break
    assert {"playwright", "psycopg"} <= excluded


def test_core_declares_the_cryptography_it_imports():
    """The dependency shape that already cost this repo a runtime with no
    licence verification in it (T-20): imported everywhere, declared nowhere,
    and therefore absent from a build assembled out of the lockfile."""
    pyproject = tomllib.loads((REPO / "core" / "pyproject.toml").read_text(encoding="utf-8"))
    declared = " ".join(pyproject["project"]["dependencies"])
    assert "cryptography" in declared
