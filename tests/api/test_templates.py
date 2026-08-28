"""Document templates: the three rules, tested as refusals.

The studio's own behaviour is the frontend's problem. What the backend has to
guarantee is narrower and load-bearing:

1. a template cannot hide a block an invoice is required to display;
2. appearance cannot carry a colour, only a token name;
3. a published version is immutable, so an issued document's layout is
   reproducible after the template has moved on.
"""

import pytest

from .conftest import bearer, create_company, signup


@pytest.fixture()
async def org(client):
    payload = await signup(client)
    headers = bearer(payload)
    company = await create_company(client, headers)
    return client, headers, company["id"]


def blocks(**overrides):
    kinds = [
        "header", "parties", "document_meta", "items", "totals",
        "payment", "notes", "terms", "footer",
    ]
    required = {"header", "parties", "document_meta", "items", "totals"}
    out = [
        {"id": k, "kind": k, "visible": k in required, "properties": {}} for k in kinds
    ]
    for kind, visible in overrides.items():
        for block in out:
            if block["kind"] == kind:
                block["visible"] = visible
    return out


async def create_template(client, headers, company_id, **body):
    payload = {"company_id": str(company_id), "name": "Standard"}
    payload.update(body)
    return await client.post("/templates", headers=headers, json=payload)


async def test_the_first_template_becomes_the_default_whatever_was_asked(org):
    """A company with templates and no default is a state the issue path has no
    answer for, so the first one is promoted regardless."""
    client, headers, company_id = org
    response = await create_template(client, headers, company_id, is_default=False)
    assert response.status_code == 201, response.text
    assert response.json()["is_default"] is True


async def test_only_one_template_is_default_at_a_time(org):
    client, headers, company_id = org
    first = (await create_template(client, headers, company_id)).json()
    second = (
        await create_template(client, headers, company_id, name="Detailed", is_default=True)
    ).json()

    listed = (await client.get("/templates", headers=headers)).json()
    defaults = [t["id"] for t in listed if t["is_default"]]
    assert defaults == [second["id"]]
    assert first["id"] not in defaults


async def test_a_template_cannot_hide_a_legally_required_block(org):
    """Rule 1. Hiding totals is not a styling choice."""
    client, headers, company_id = org
    response = await create_template(
        client, headers, company_id, blocks=blocks(totals=False)
    )
    assert response.status_code == 422, response.text


async def test_appearance_refuses_a_raw_colour(org):
    """Rule 2, and the reason it lives here rather than only in the palette guard:
    that test walks the source tree, and a hex in a database row is invisible to it."""
    client, headers, company_id = org
    response = await create_template(
        client,
        headers,
        company_id,
        appearance={
            "accent_token": "#0f766e",
            "text_token": "--bg-ink",
            "border_token": "--bg-line",
        },
    )
    assert response.status_code == 422, response.text


async def test_appearance_accepts_a_token_name(org):
    client, headers, company_id = org
    response = await create_template(
        client,
        headers,
        company_id,
        appearance={
            "accent_token": "--bg-accent-strong",
            "text_token": "--bg-ink",
            "border_token": "--bg-line",
        },
    )
    assert response.status_code == 201, response.text


async def test_an_unpublished_template_has_no_snapshot(org):
    client, headers, company_id = org
    template = (await create_template(client, headers, company_id)).json()
    assert template["is_published"] is False

    response = await client.get(f"/templates/{template['id']}/snapshot", headers=headers)
    assert response.status_code == 409, response.text


async def test_editing_a_template_after_publishing_does_not_change_the_snapshot(org):
    """Rule 3, which is the whole reason `template_versions` exists.

    Without it, editing a template would restyle every document already sent
    with it, and nobody would find out until a customer compared two copies.
    """
    client, headers, company_id = org
    template = (await create_template(client, headers, company_id)).json()

    published = (
        await client.post(f"/templates/{template['id']}/publish", headers=headers)
    ).json()
    assert published["published_version"] == 1

    before = (
        await client.get(f"/templates/{template['id']}/snapshot", headers=headers)
    ).json()

    # Move the draft somewhere clearly different.
    edited = await client.patch(
        f"/templates/{template['id']}",
        headers=headers,
        json={
            "name": "Renamed",
            "blocks": blocks(notes=True, footer=True),
            "appearance": {"accent_token": "--bg-danger", "body_size_pt": 14},
        },
    )
    assert edited.status_code == 200, edited.text

    after = (
        await client.get(f"/templates/{template['id']}/snapshot", headers=headers)
    ).json()

    assert after["version"] == before["version"] == 1
    assert after["blocks"] == before["blocks"]
    assert after["appearance"] == before["appearance"]
    assert after["appearance"]["accent_token"] != "--bg-danger"


async def test_publishing_again_makes_a_new_version(org):
    client, headers, company_id = org
    template = (await create_template(client, headers, company_id)).json()
    await client.post(f"/templates/{template['id']}/publish", headers=headers)
    await client.patch(
        f"/templates/{template['id']}",
        headers=headers,
        json={"appearance": {"accent_token": "--bg-danger"}},
    )
    second = (
        await client.post(f"/templates/{template['id']}/publish", headers=headers)
    ).json()
    assert second["published_version"] == 2

    snapshot = (
        await client.get(f"/templates/{template['id']}/snapshot", headers=headers)
    ).json()
    assert snapshot["version"] == 2
    assert snapshot["appearance"]["accent_token"] == "--bg-danger"


async def test_the_default_template_cannot_be_deleted(org):
    client, headers, company_id = org
    template = (await create_template(client, headers, company_id)).json()
    response = await client.delete(f"/templates/{template['id']}", headers=headers)
    assert response.status_code == 409, response.text


async def test_a_non_default_template_can_be_deleted(org):
    client, headers, company_id = org
    await create_template(client, headers, company_id)
    spare = (await create_template(client, headers, company_id, name="Spare")).json()
    response = await client.delete(f"/templates/{spare['id']}", headers=headers)
    assert response.status_code == 204, response.text


async def test_templates_are_scoped_to_their_organization(client):
    alice = bearer(await signup(client))
    alice_company = (await create_company(client, alice))["id"]
    template = (await create_template(client, alice, alice_company)).json()

    bob = bearer(
        await signup(client, email="bob@example.com", organization_name="Bob BV")
    )
    assert (
        await client.get(f"/templates/{template['id']}", headers=bob)
    ).status_code == 404
    assert (await client.get("/templates", headers=bob)).json() == []
