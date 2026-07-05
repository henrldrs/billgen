class AuthError(RuntimeError):
    """Base class — mapped to 401 unless a subclass overrides."""

    status_code = 401


class InvalidCredentialsError(AuthError):
    """Unknown email or wrong password. One error for both: don't leak which."""


class InvalidTokenError(AuthError):
    """Missing, malformed, expired, revoked, or wrong-type token."""


class EmailAlreadyRegisteredError(AuthError):
    status_code = 409
