"""Signup / login / refresh / logout.

This is API-layer infrastructure, not domain: it composes ORM rows directly
(users, orgs, memberships, credentials, refresh tokens) in single transactions.
Business use-cases stay in core.services."""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from db.models import (
    AuditLogRow,
    OrganizationRow,
    OrgMembershipRow,
    RefreshTokenRow,
    UserCredentialRow,
    UserRow,
)

from .errors import EmailAlreadyRegisteredError, InvalidCredentialsError, InvalidTokenError
from .jwt import JwtCodec, TokenPair
from .password import hash_password, verify_password, waste_time

MIN_PASSWORD_LENGTH = 8
DESKTOP_EMAIL = "desktop@localhost.billgen"


@dataclass(frozen=True)
class SignupResult:
    user_id: UUID
    email: str
    display_name: str
    organization_id: UUID
    organization_name: str
    tokens: TokenPair


@dataclass(frozen=True)
class LoginResult:
    user_id: UUID
    email: str
    display_name: str
    organization_id: UUID
    role: str
    memberships: list[tuple[UUID, str]]
    tokens: TokenPair


@dataclass(frozen=True)
class SessionInfo:
    """One live refresh token, as the security screen shows it.

    No IP address and no user agent: `audit_log` has columns for both and
    nothing writes them, so inventing them here would put data on a screen that
    the privacy inventory says does not exist.
    """

    jti: UUID
    created_at: datetime
    expires_at: datetime


def _as_utc(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; they were stored as UTC."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


class AuthService:
    def __init__(self, session_factory: sessionmaker[Session], codec: JwtCodec) -> None:
        self._session_factory = session_factory
        self._codec = codec

    def _issue_pair(self, session: Session, user_id: UUID, org_id: UUID, role: str) -> TokenPair:
        access = self._codec.issue_access(user_id, org_id, role)
        refresh, jti, expires_at = self._codec.issue_refresh(user_id, org_id)
        session.add(
            RefreshTokenRow(jti=jti, user_id=user_id, organization_id=org_id, expires_at=expires_at)
        )
        return TokenPair(
            access_token=access,
            refresh_token=refresh,
            expires_in=self._codec.access_ttl_seconds,
        )

    def signup(
        self, *, email: str, password: str, display_name: str, organization_name: str
    ) -> SignupResult:
        email = email.strip().lower()
        with self._session_factory() as session:
            existing = session.execute(
                select(UserRow).where(UserRow.email == email)
            ).scalar_one_or_none()
            if existing is not None:
                raise EmailAlreadyRegisteredError(email)

            org = OrganizationRow(id=uuid4(), name=organization_name)
            user = UserRow(id=uuid4(), email=email, display_name=display_name)
            session.add_all([org, user])
            # Flush parents first: without relationship() directives SQLAlchemy
            # does not order plain-FK inserts across tables in a single flush.
            session.flush()
            session.add_all(
                [
                    OrgMembershipRow(organization_id=org.id, user_id=user.id, role="owner"),
                    UserCredentialRow(user_id=user.id, password_hash=hash_password(password)),
                    AuditLogRow(
                        organization_id=org.id,
                        actor_user_id=user.id,
                        action="create",
                        target_type="organization",
                        target_id=org.id,
                        after={"name": organization_name, "via": "signup"},
                    ),
                ]
            )
            tokens = self._issue_pair(session, user.id, org.id, "owner")
            session.commit()
            return SignupResult(
                user_id=user.id,
                email=email,
                display_name=display_name,
                organization_id=org.id,
                organization_name=organization_name,
                tokens=tokens,
            )

    def login(
        self, *, email: str, password: str, organization_id: UUID | None = None
    ) -> LoginResult:
        email = email.strip().lower()
        with self._session_factory() as session:
            user = session.execute(
                select(UserRow).where(UserRow.email == email, UserRow.is_active)
            ).scalar_one_or_none()
            credential = session.get(UserCredentialRow, user.id) if user is not None else None
            #  Spend the verification even when there is nothing to verify, so
            #  an unknown address and a wrong password cost the same. The
            #  message was already identical; the *timing* was not, and that is
            #  what made this endpoint answer "is this person a customer".
            #  See `password.waste_time` (SEC-19).
            if user is None or credential is None:
                waste_time()
                raise InvalidCredentialsError("Invalid email or password")
            if not verify_password(credential.password_hash, password):
                raise InvalidCredentialsError("Invalid email or password")

            membership_rows = list(
                session.execute(
                    select(OrgMembershipRow).where(OrgMembershipRow.user_id == user.id)
                ).scalars()
            )
            if not membership_rows:
                raise InvalidCredentialsError("User has no organization")

            memberships = [(m.organization_id, m.role) for m in membership_rows]
            if organization_id is not None:
                selected = next((m for m in memberships if m[0] == organization_id), None)
                if selected is None:
                    raise InvalidCredentialsError("Not a member of that organization")
            else:
                selected = memberships[0]

            org_id, role = selected
            session.add(
                AuditLogRow(
                    organization_id=org_id,
                    actor_user_id=user.id,
                    action="login",
                    target_type="user",
                    target_id=user.id,
                )
            )
            tokens = self._issue_pair(session, user.id, org_id, role)
            session.commit()
            return LoginResult(
                user_id=user.id,
                email=user.email,
                display_name=user.display_name,
                organization_id=org_id,
                role=role,
                memberships=memberships,
                tokens=tokens,
            )

    def refresh(self, refresh_token: str) -> TokenPair:
        payload = self._codec.decode(refresh_token, expected_type="refresh")
        jti = UUID(payload["jti"])
        user_id = UUID(payload["sub"])
        org_id = UUID(payload["org_id"])

        with self._session_factory() as session:
            row = session.get(RefreshTokenRow, jti)
            now = datetime.now(UTC)
            if row is None or row.revoked_at is not None or _as_utc(row.expires_at) < now:
                raise InvalidTokenError("Refresh token is revoked or expired")

            membership = session.get(OrgMembershipRow, (org_id, user_id))
            if membership is None:
                raise InvalidTokenError("Membership no longer exists")

            row.revoked_at = now  # rotation: each refresh token is single-use
            tokens = self._issue_pair(session, user_id, org_id, membership.role)
            session.commit()
            return tokens

    def logout(self, refresh_token: str) -> None:
        payload = self._codec.decode(refresh_token, expected_type="refresh")
        jti = UUID(payload["jti"])
        with self._session_factory() as session:
            row = session.get(RefreshTokenRow, jti)
            if row is not None and row.revoked_at is None:
                row.revoked_at = datetime.now(UTC)
                session.add(
                    AuditLogRow(
                        organization_id=row.organization_id,
                        actor_user_id=row.user_id,
                        action="logout",
                        target_type="user",
                        target_id=row.user_id,
                    )
                )
            session.commit()

    # -- session management -------------------------------------------
    #
    # Rotation means a signed-in user accumulates one revoked row per refresh,
    # so "your sessions" is the *live* set: not revoked and not expired. Showing
    # the whole table would list every refresh the browser has ever done and
    # read as a security incident.

    def list_sessions(self, user_id: UUID) -> list[SessionInfo]:
        now = datetime.now(UTC)
        with self._session_factory() as session:
            rows = session.execute(
                select(RefreshTokenRow)
                .where(
                    RefreshTokenRow.user_id == user_id,
                    RefreshTokenRow.revoked_at.is_(None),
                    RefreshTokenRow.expires_at > now,
                )
                .order_by(RefreshTokenRow.created_at.desc())
            ).scalars()
            return [
                SessionInfo(
                    jti=row.jti,
                    created_at=_as_utc(row.created_at),
                    expires_at=_as_utc(row.expires_at),
                )
                for row in rows
            ]

    def revoke_session(self, user_id: UUID, jti: UUID) -> bool:
        """Revoke one of *this user's* sessions.

        Scoped by user_id rather than trusting the id alone: a jti is a bare
        UUID in a URL, and without the ownership check any signed-in person
        could sign out anyone else whose id they guessed or saw in a log.
        """
        with self._session_factory() as session:
            row = session.get(RefreshTokenRow, jti)
            if row is None or row.user_id != user_id or row.revoked_at is not None:
                return False
            row.revoked_at = datetime.now(UTC)
            session.add(
                AuditLogRow(
                    organization_id=row.organization_id,
                    actor_user_id=user_id,
                    action="session.revoke",
                    target_type="user",
                    target_id=user_id,
                )
            )
            session.commit()
            return True

    def change_password(self, user_id: UUID, current: str, new: str) -> None:
        """Change a password, verifying the current one first.

        Every other session is revoked on success. That is the point of the
        feature as much as the new password is: someone changing it because they
        believe it was seen needs the sessions it opened closed, and leaving them
        alive makes the change cosmetic.
        """
        with self._session_factory() as session:
            credential = session.get(UserCredentialRow, user_id)
            if credential is None or not verify_password(credential.password_hash, current):
                raise InvalidCredentialsError("Current password is incorrect")

            credential.password_hash = hash_password(new)
            now = datetime.now(UTC)
            for row in session.execute(
                select(RefreshTokenRow).where(
                    RefreshTokenRow.user_id == user_id,
                    RefreshTokenRow.revoked_at.is_(None),
                )
            ).scalars():
                row.revoked_at = now

            membership = (
                session.execute(select(OrgMembershipRow).where(OrgMembershipRow.user_id == user_id))
                .scalars()
                .first()
            )
            if membership is not None:
                session.add(
                    AuditLogRow(
                        organization_id=membership.organization_id,
                        actor_user_id=user_id,
                        action="password.change",
                        target_type="user",
                        target_id=user_id,
                    )
                )
            session.commit()

    def desktop_bootstrap(self) -> LoginResult:
        """Single-user local session for the desktop build. Creates a singleton
        local org + owner on first call, then issues tokens on every call. Only
        reachable when settings.desktop_mode is on (guarded at the router)."""
        with self._session_factory() as session:
            user = session.execute(
                select(UserRow).where(UserRow.email == DESKTOP_EMAIL)
            ).scalar_one_or_none()

            if user is None:
                org = OrganizationRow(id=uuid4(), name="My Business")
                user = UserRow(id=uuid4(), email=DESKTOP_EMAIL, display_name="Local user")
                session.add_all([org, user])
                session.flush()
                session.add_all(
                    [
                        OrgMembershipRow(organization_id=org.id, user_id=user.id, role="owner"),
                        UserCredentialRow(
                            user_id=user.id,
                            # random: desktop login is via bootstrap, never password
                            password_hash=hash_password(uuid4().hex),
                        ),
                    ]
                )
                org_id = org.id
            else:
                membership = session.execute(
                    select(OrgMembershipRow).where(OrgMembershipRow.user_id == user.id)
                ).scalar_one()
                org_id = membership.organization_id

            tokens = self._issue_pair(session, user.id, org_id, "owner")
            session.commit()
            return LoginResult(
                user_id=user.id,
                email=user.email,
                display_name=user.display_name,
                organization_id=org_id,
                role="owner",
                memberships=[(org_id, "owner")],
                tokens=tokens,
            )
