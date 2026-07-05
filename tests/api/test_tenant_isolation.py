"""Phase 5 exit criterion — a hand-crafted request cannot read another tenant's data."""

import jwt as pyjwt
import pytest

from .conftest import bearer, signup


async def test_each_org_sees_only_itself(client):
    alice = await signup(client, email="alice@example.com", organization_name="Org A")
    bob = await signup(client, email="bob@example.com", organization_name="Org B")

    org_a = await client.get("/orgs/current", headers=bearer(alice))
    org_b = await client.get("/orgs/current", headers=bearer(bob))
    assert org_a.json()["name"] == "Org A"
    assert org_b.json()["name"] == "Org B"


async def test_companies_are_tenant_isolated(client):
    alice = await signup(client, email="alice@example.com", organization_name="Org A")
    bob = await signup(client, email="bob@example.com", organization_name="Org B")

    created = await client.post(
        "/companies",
        json={"name": "Acme Consulting", "vat_number": "BE0123456789"},
        headers=bearer(alice),
    )
    assert created.status_code == 201, created.text
    assert created.json()["organization_id"] == alice["organization_id"]

    alice_view = await client.get("/companies", headers=bearer(alice))
    bob_view = await client.get("/companies", headers=bearer(bob))
    assert [c["name"] for c in alice_view.json()] == ["Acme Consulting"]
    assert bob_view.json() == []


@pytest.mark.filterwarnings("ignore:The HMAC key is")
async def test_forged_token_with_wrong_secret_rejected(client):
    alice = await signup(client, email="alice@example.com", organization_name="Org A")
    bob = await signup(client, email="bob@example.com", organization_name="Org B")

    # Attacker knows all the claim values but not the server secret.
    forged = pyjwt.encode(
        {
            "sub": alice["user_id"],
            "org_id": bob["organization_id"],  # tries to jump into Org B
            "role": "owner",
            "type": "access",
            "exp": 9999999999,
        },
        "wrong-secret",
        algorithm="HS256",
    )
    response = await client.get(
        "/companies", headers={"Authorization": f"Bearer {forged}"}
    )
    assert response.status_code == 401


async def test_alg_none_token_rejected(client):
    # Classic JWT attack: alg=none with no signature.
    header_payload = pyjwt.api_jws.PyJWS().encode(
        b'{"sub":"x","org_id":"y","type":"access"}', key=None, algorithm="none"
    )
    response = await client.get(
        "/companies", headers={"Authorization": f"Bearer {header_payload}"}
    )
    assert response.status_code == 401
