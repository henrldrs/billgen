import json
from datetime import date, timedelta

import pytest

from desktop.licensing import (
    LicenseError,
    check_license,
    generate_keypair,
    sign_license,
    verify_license,
)

TODAY = date.today()


@pytest.fixture()
def keypair():
    return generate_keypair()  # (private_pem, public_pem)


def _payload(**overrides):
    payload = {
        "email": "user@example.com",
        "plan": "personal",
        "expires": (TODAY + timedelta(days=365)).isoformat(),
        "hardware_id": "HW-123",
    }
    payload.update(overrides)
    return payload


def test_sign_then_verify_roundtrip(keypair):
    private_pem, public_pem = keypair
    document = sign_license(_payload(), private_pem)
    info = verify_license(document, public_pem)
    assert info.email == "user@example.com"
    assert info.plan == "personal"
    assert info.hardware_id == "HW-123"
    assert info.expires == TODAY + timedelta(days=365)


def test_tampered_payload_rejected(keypair):
    private_pem, public_pem = keypair
    document = sign_license(_payload(), private_pem)
    document["payload"]["plan"] = "business"  # forge an upgrade
    with pytest.raises(LicenseError, match="signature"):
        verify_license(document, public_pem)


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


def test_check_license_absent_not_required_returns_none(tmp_path, keypair):
    _, public_pem = keypair
    result = check_license(tmp_path / "missing.billgenlic", public_pem)
    assert result is None


def test_check_license_absent_but_required_raises(tmp_path, keypair):
    _, public_pem = keypair
    with pytest.raises(LicenseError, match="No license"):
        check_license(tmp_path / "missing.billgenlic", public_pem, require_license=True)


def test_check_license_present_valid(tmp_path, keypair):
    private_pem, public_pem = keypair
    path = tmp_path / "license.billgenlic"
    path.write_text(json.dumps(sign_license(_payload(), private_pem)), encoding="utf-8")
    info = check_license(path, public_pem)
    assert info is not None
    assert info.email == "user@example.com"


def test_check_license_present_without_pubkey_raises(tmp_path, keypair):
    private_pem, _ = keypair
    path = tmp_path / "license.billgenlic"
    path.write_text(json.dumps(sign_license(_payload(), private_pem)), encoding="utf-8")
    with pytest.raises(LicenseError, match="public key"):
        check_license(path, None)
