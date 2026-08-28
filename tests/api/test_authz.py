"""Role enforcement: what a person may do, as opposed to what a plan includes.

The rules being pinned here, in the order they matter:

1. **A viewer may read everything and write nothing.** This is the hole the
   suite existed without: roles rode in the JWT and were read in exactly one
   place — `/users/me`, to display them — so a viewer could void an issued
   invoice.
2. **403 and 402 stay apart.** 403 means this person may not; 402 means this
   plan does not include it. Only the second opens an upgrade modal, so a
   viewer hitting a full quota must still see 403 — the authorization answer
   is the true one, and no payment changes it.
3. **The refusal names who could.** A 403 body carries `allowed_roles` so the
   UI can say "ask an admin" rather than "forbidden".
"""

import pytest
from sqlalchemy import update

from api.authz import Permission, permissions_for
from core.models import Role
from db.models import OrganizationRow, OrgMembershipRow

from .conftest import (
    bearer,
    create_client_record,
    create_company,
    create_draft,
    create_invoice,
    invoice_payload,
    signup,
)

PASSWORD = "s3cret-pass"


def _engine(client):
    return client._transport.app.state.session_factory.kw["bind"]  # noqa: SLF001


async def as_role(client, role: str, email: str = "alice@example.com") -> dict:
    """Demote the signed-up owner to `role` and log back in.

    Written through the membership row and then re-authenticated rather than
    minting a token by hand: the role reaches a request as a JWT claim issued
    at login, and this is the path that proves the claim survives that trip.
    There is no invite flow to create a second user with — that waits on B1.
    """
    with _engine(client).begin() as conn:
        conn.execute(update(OrgMembershipRow).values(role=role))
    response = await client.post("/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["role"] == role
    return body


async def workspace(client):
    """An owner's org with a company, a client, a draft and an issued invoice —
    all the material a lesser role will later be refused permission to change."""
    owner = await signup(client)
    headers = bearer(owner)
    company = await create_company(client, headers)
    record = await create_client_record(client, headers, company["id"])
    draft = await create_draft(client, headers, company["id"], record["id"])
    issued = await create_invoice(client, headers, company["id"], record["id"])
    return headers, company, record, draft, issued


# ── The matrix itself ──────────────────────────────────────────────────────


def test_viewer_holds_no_permissions():
    assert permissions_for(Role.VIEWER.value) == frozenset()


def test_owner_holds_every_permission():
    assert permissions_for(Role.OWNER.value) == frozenset(Permission)


def test_only_the_owner_may_restore_a_backup():
    for role in (Role.ADMIN, Role.MEMBER, Role.VIEWER):
        assert Permission.BACKUP_RESTORE not in permissions_for(role.value)


def test_a_member_may_issue_but_not_void():
    granted = permissions_for(Role.MEMBER.value)
    assert Permission.INVOICE_ISSUE in granted
    assert Permission.INVOICE_VOID not in granted


def test_an_unknown_role_gets_nothing():
    """A claim from a token minted before a rename, or tampered with. Failing
    closed is the only safe reading of "I do not know what this is"."""
    assert permissions_for("superuser") == frozenset()
    assert permissions_for("") == frozenset()


# ── The hole this closes ───────────────────────────────────────────────────


async def test_a_viewer_cannot_void_an_invoice(client):
    _, _, _, _, issued = await workspace(client)
    viewer = bearer(await as_role(client, Role.VIEWER.value))

    response = await client.post(
        f"/invoices/{issued['id']}/void", json={"reason": "nope"}, headers=viewer
    )

    assert response.status_code == 403, response.text
    body = response.json()
    assert body["error"] == "permission_denied"
    assert body["permission"] == "invoice.void"
    assert body["role"] == "viewer"
    # Names who could, so the UI can point at a person instead of a wall.
    assert body["allowed_roles"] == ["owner", "admin"]


async def test_a_viewer_reads_everything(client):
    _, company, record, _, issued = await workspace(client)
    viewer = bearer(await as_role(client, Role.VIEWER.value))

    for path in (
        "/invoices",
        "/clients",
        "/products",
        "/companies",
        f"/invoices/{issued['id']}",
        f"/companies/{company['id']}",
        f"/clients/{record['id']}",
        f"/reports/kpi?company_id={company['id']}",
        "/activity",
    ):
        response = await client.get(path, headers=viewer)
        assert response.status_code == 200, f"{path}: {response.text}"


@pytest.mark.parametrize(
    ("method", "path", "body", "permission"),
    [
        ("post", "/clients", None, "client.write"),
        ("post", "/products", None, "product.write"),
        ("post", "/companies", None, "company.write"),
        ("post", "/invoices", None, "invoice.write"),
        ("post", "/credit-notes", None, "credit_note.write"),
        ("post", "/payments", None, "payment.write"),
        ("post", "/imports/legacy/preview", {}, "import.run"),
        ("post", "/imports/legacy/commit", {}, "import.run"),
        ("post", "/backup/restore", {}, "backup.restore"),
        ("get", "/backup/export", None, "backup.export"),
    ],
)
async def test_every_write_endpoint_refuses_a_viewer(client, method, path, body, permission):
    """Refused before the body is looked at — an empty payload would be a 422
    if authorization ran second, and 422 leaks that the endpoint would have
    tried."""
    await workspace(client)
    viewer = bearer(await as_role(client, Role.VIEWER.value))

    call = getattr(client, method)
    response = await call(path, headers=viewer, **({} if body is None else {"json": body}))

    assert response.status_code == 403, f"{path}: {response.text}"
    assert response.json()["permission"] == permission


# ── Member and admin ───────────────────────────────────────────────────────


async def test_a_member_does_the_billing_work(client):
    _, company, record, _, _ = await workspace(client)
    member = bearer(await as_role(client, Role.MEMBER.value))

    created = await client.post(
        "/invoices", json=invoice_payload(company["id"], record["id"]), headers=member
    )
    assert created.status_code == 201, created.text
    issued = await client.post(f"/invoices/{created.json()['id']}/issue", json={}, headers=member)
    assert issued.status_code == 200, issued.text


async def test_a_member_may_not_void_or_edit_the_company(client):
    _, company, _, _, issued = await workspace(client)
    member = bearer(await as_role(client, Role.MEMBER.value))

    void = await client.post(
        f"/invoices/{issued['id']}/void", json={"reason": "mistake"}, headers=member
    )
    assert void.status_code == 403, void.text

    patch = await client.patch(f"/companies/{company['id']}", json={"city": "Gent"}, headers=member)
    assert patch.status_code == 403, patch.text


async def test_an_admin_may_void_but_may_not_restore(client):
    _, _, _, _, issued = await workspace(client)
    admin = bearer(await as_role(client, Role.ADMIN.value))

    void = await client.post(
        f"/invoices/{issued['id']}/void", json={"reason": "mistake"}, headers=admin
    )
    assert void.status_code == 200, void.text

    # The one action with no undo: it overwrites the tenant's whole dataset.
    restore = await client.post("/backup/restore", json={}, headers=admin)
    assert restore.status_code == 403, restore.text


# ── 403 and 402 do not blur ────────────────────────────────────────────────


async def test_authorization_is_decided_before_the_quota(client):
    """A viewer on a spent Free allowance gets 403, not 402.

    The order matters commercially, not just technically: 402 is the upgrade
    modal, and offering a viewer a bigger plan is a lie — no amount of money
    makes them an admin.
    """
    owner_headers, company, record, _, _ = await workspace(client)
    with _engine(client).begin() as conn:
        conn.execute(update(OrganizationRow).values(plan_tier="free"))
    for _ in range(10):
        await client.post(
            "/invoices",
            json=invoice_payload(company["id"], record["id"]),
            headers=owner_headers,
        )
    spent = await client.post(
        "/invoices",
        json=invoice_payload(company["id"], record["id"]),
        headers=owner_headers,
    )
    assert spent.status_code == 402, spent.text

    viewer = bearer(await as_role(client, Role.VIEWER.value))
    response = await client.post(
        "/invoices", json=invoice_payload(company["id"], record["id"]), headers=viewer
    )
    assert response.status_code == 403, response.text


# ── What the client is told ────────────────────────────────────────────────


async def test_users_me_carries_the_permission_list(client):
    await workspace(client)

    viewer = bearer(await as_role(client, Role.VIEWER.value))
    body = (await client.get("/users/me", headers=viewer)).json()
    assert body["role"] == "viewer"
    assert body["permissions"] == []

    admin = bearer(await as_role(client, Role.ADMIN.value))
    body = (await client.get("/users/me", headers=admin)).json()
    assert "invoice.void" in body["permissions"]
    assert "backup.restore" not in body["permissions"]


# ── The invariant that keeps this true ─────────────────────────────────────


def _mutating_routes(app):
    """Every route that changes something, and whether it declares a permission."""
    import inspect

    out = []
    for route in app.routes:
        methods = getattr(route, "methods", set()) - {"HEAD", "OPTIONS"}
        if not methods & {"POST", "PATCH", "PUT", "DELETE"}:
            continue
        declares = any(
            getattr(getattr(param.default, "dependency", None), "__qualname__", "").startswith(
                "require_permission"
            )
            for param in inspect.signature(route.endpoint).parameters.values()
        )
        out.append((sorted(methods)[0], route.path, declares))
    return out


# The only writes that may go unguarded, each for a reason that has to still be
# true when someone reads this list:
#
#   /auth/*            — unauthenticated by construction. There is no role to
#                        check yet; that is what these endpoints are for.
#   /invoices/preview  — computes totals and writes nothing. A viewer asking
#                        "what would this come to" changes no record.
#   /backup/export     — a GET, so it is not in this list at all, but it *is*
#                        guarded: it copies the whole organization out.
#   /users/me (PATCH)  — a person editing their own display name. The identity
#                        it acts on comes from the token, never the body, so
#                        there is nothing to authorize *against*: a user cannot
#                        address anyone else's profile, and every role including
#                        `viewer` may rename itself. A permission here would have
#                        to be one every role holds, which is not a permission.
#   /desktop/plan-tier — a dev affordance, not a product action, so there is no
#                        permission that fits: no role should be able to grant
#                        its own organization a paid plan, and inventing
#                        `plan.write` would imply some role can. Its guard is
#                        `desktop_mode`, which the API refuses to start with in
#                        production (see api/config.validate_for_boot), so on a
#                        hosted deployment the endpoint 404s for everyone
#                        regardless of role. Delete this entry the day checkout
#                        exists — a real upgrade path is a product action and
#                        will need a real permission.
_UNGUARDED_BY_DESIGN = {
    ("POST", "/auth/signup"),
    ("POST", "/auth/login"),
    ("POST", "/auth/logout"),
    ("POST", "/auth/refresh"),
    ("POST", "/auth/desktop-bootstrap"),
    ("POST", "/invoices/preview"),
    ("POST", "/desktop/plan-tier"),
    ("PATCH", "/users/me"),
}


async def test_every_write_endpoint_declares_a_permission(client):
    """The invariant, not a sample.

    The parametrised test above checks the endpoints that existed when it was
    written. This one checks the ones that did not: a new write route ships
    unguarded unless its author either declares a permission or comes here and
    argues, in writing, why it does not need one.
    """
    app = client._transport.app  # noqa: SLF001

    unguarded = {
        (method, path)
        for method, path, declares in _mutating_routes(app)
        if not declares
    }

    assert unguarded == _UNGUARDED_BY_DESIGN, (
        "a write endpoint declares no permission — add require_permission(...) "
        "to it, or add it to _UNGUARDED_BY_DESIGN with the reason"
    )
