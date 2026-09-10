import json
from datetime import date, timedelta

import pytest

from desktop.licensing import (
    MACHINE_ID_ENV,
    LicenseError,
    check_license,
    format_fingerprint,
    generate_keypair,
    machine_fingerprint,
    public_key,
    public_key_path,
    sign_license,
    verify_license,
)

TODAY = date.today()
THIS_MACHINE = "aaaabbbbccccddddeeeeffff00001111"
ANOTHER_MACHINE = "99998888777766665555444433332222"


@pytest.fixture()
def keypair():
    return generate_keypair()  # (private_pem, public_pem)


@pytest.fixture()
def machine(monkeypatch):
    """Pin the fingerprint so the suite does not depend on the machine it runs on."""
    monkeypatch.setenv(MACHINE_ID_ENV, THIS_MACHINE)
    return THIS_MACHINE


def _payload(**overrides):
    payload = {
        "email": "user@example.com",
        "plan": "personal",
        "expires": (TODAY + timedelta(days=365)).isoformat(),
        "hardware_id": THIS_MACHINE,
    }
    payload.update(overrides)
    return payload


def _write(tmp_path, private_pem, **overrides):
    path = tmp_path / "license.billgenlic"
    document = sign_license(_payload(**overrides), private_pem)
    path.write_text(json.dumps(document), encoding="utf-8")
    return path


def test_sign_then_verify_roundtrip(keypair):
    private_pem, public_pem = keypair
    document = sign_license(_payload(), private_pem)
    info = verify_license(document, public_pem)
    assert info.email == "user@example.com"
    assert info.plan == "personal"
    assert info.hardware_id == THIS_MACHINE
    assert info.expires == TODAY + timedelta(days=365)


def test_tampered_payload_rejected(keypair):
    private_pem, public_pem = keypair
    document = sign_license(_payload(), private_pem)
    document["payload"]["plan"] = "business"  # forge an upgrade
    with pytest.raises(LicenseError, match="signature"):
        verify_license(document, public_pem)


def test_edited_machine_rejected(keypair):
    """The binding is signed, so moving a license is forging one."""
    private_pem, public_pem = keypair
    document = sign_license(_payload(), private_pem)
    document["payload"]["hardware_id"] = ANOTHER_MACHINE
    with pytest.raises(LicenseError, match="signature"):
        verify_license(document, public_pem, machine_id=ANOTHER_MACHINE)


def test_wrong_public_key_rejected(keypair):
    private_pem, _ = keypair
    _, other_public = generate_keypair()
    document = sign_license(_payload(), private_pem)
    with pytest.raises(LicenseError):
        verify_license(document, other_public)


def test_expired_license_rejected(keypair):
    private_pem, public_pem = keypair
    document = sign_license(
        _payload(expires=(TODAY - timedelta(days=1)).isoformat()), private_pem
    )
    with pytest.raises(LicenseError, match="expired"):
        verify_license(document, public_pem)


def test_no_expiry_is_allowed(keypair):
    private_pem, public_pem = keypair
    document = sign_license(_payload(expires=None), private_pem)
    info = verify_license(document, public_pem)
    assert info.expires is None


def test_verify_without_a_machine_does_not_check_one(keypair):
    """The pure verification stays pure — the policy decides who is asking."""
    private_pem, public_pem = keypair
    document = sign_license(_payload(hardware_id=ANOTHER_MACHINE), private_pem)
    assert verify_license(document, public_pem).hardware_id == ANOTHER_MACHINE


def test_check_license_absent_not_required_returns_none(tmp_path, keypair):
    _, public_pem = keypair
    result = check_license(tmp_path / "missing.billgenlic", public_pem)
    assert result is None


def test_check_license_absent_but_required_raises(tmp_path, keypair):
    _, public_pem = keypair
    with pytest.raises(LicenseError, match="No license"):
        check_license(tmp_path / "missing.billgenlic", public_pem, require_license=True)


def test_check_license_present_valid(tmp_path, keypair, machine):
    private_pem, public_pem = keypair
    path = _write(tmp_path, private_pem)
    info = check_license(path, public_pem, require_license=True)
    assert info is not None
    assert info.email == "user@example.com"


def test_check_license_for_another_machine_is_refused(tmp_path, keypair, machine):
    """T-22's point: a license signed for Emilia's laptop does not run here."""
    private_pem, public_pem = keypair
    path = _write(tmp_path, private_pem, hardware_id=ANOTHER_MACHINE)
    with pytest.raises(LicenseError, match="different machine"):
        check_license(path, public_pem, require_license=True)


def test_the_refusal_names_both_machines(tmp_path, keypair, machine):
    private_pem, public_pem = keypair
    path = _write(tmp_path, private_pem, hardware_id=ANOTHER_MACHINE)
    with pytest.raises(LicenseError) as raised:
        check_license(path, public_pem)
    message = str(raised.value)
    assert format_fingerprint(ANOTHER_MACHINE) in message
    assert format_fingerprint(THIS_MACHINE) in message


def test_portable_license_runs_anywhere(tmp_path, keypair, machine):
    """No hardware_id is a deliberate reissue for a laptop that no longer boots."""
    private_pem, public_pem = keypair
    path = _write(tmp_path, private_pem, hardware_id=None)
    info = check_license(path, public_pem, require_license=True)
    assert info is not None
    assert info.hardware_id is None


def test_bound_license_on_an_unidentifiable_machine_is_refused(
    tmp_path, keypair, monkeypatch
):
    private_pem, public_pem = keypair
    monkeypatch.setenv(MACHINE_ID_ENV, "")
    monkeypatch.setattr("desktop.licensing._raw_machine_id", lambda: None)
    path = _write(tmp_path, private_pem)
    with pytest.raises(LicenseError, match="could not be read"):
        check_license(path, public_pem, require_license=True)


def test_check_license_present_without_pubkey_raises(tmp_path, keypair):
    private_pem, _ = keypair
    path = _write(tmp_path, private_pem)
    with pytest.raises(LicenseError, match="public key"):
        check_license(path, None)


def test_required_without_pubkey_fails_closed(tmp_path):
    """A build that cannot verify anything must not start, license file or not."""
    with pytest.raises(LicenseError, match="no public key"):
        check_license(tmp_path / "missing.billgenlic", None, require_license=True)


def test_machine_fingerprint_is_stable_and_opaque(monkeypatch):
    monkeypatch.delenv(MACHINE_ID_ENV, raising=False)
    monkeypatch.setattr(
        "desktop.licensing._raw_machine_id", lambda: "{DEAD-BEEF-0000-1111}"
    )
    first = machine_fingerprint()
    assert first == machine_fingerprint()
    assert first is not None
    assert len(first) == 32
    # hashed, not the identifier itself: this string ends up in an emailed file
    assert "DEAD-BEEF" not in first
    # and case in the platform's own value must not change the answer
    monkeypatch.setattr(
        "desktop.licensing._raw_machine_id", lambda: "{dead-beef-0000-1111}"
    )
    assert machine_fingerprint() == first


def test_machine_fingerprint_env_override_wins(monkeypatch):
    monkeypatch.setenv(MACHINE_ID_ENV, THIS_MACHINE)
    assert machine_fingerprint() == THIS_MACHINE


def test_format_fingerprint_groups_in_fives():
    assert format_fingerprint("abcdefghij") == "abcde-fghij"


def test_public_key_env_override(tmp_path, keypair, monkeypatch):
    _, public_pem = keypair
    elsewhere = tmp_path / "somewhere" / "license_key.pub"
    elsewhere.parent.mkdir()
    elsewhere.write_bytes(public_pem)
    monkeypatch.setenv("BILLGEN_LICENSE_PUBLIC_KEY", str(elsewhere))
    assert public_key_path() == elsewhere
    assert public_key() == public_pem


def test_public_key_absent_is_none_not_an_error(tmp_path, monkeypatch):
    monkeypatch.setenv("BILLGEN_LICENSE_PUBLIC_KEY", str(tmp_path / "nothing.pub"))
    assert public_key() is None
