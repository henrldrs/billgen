from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher()  # argon2id with library defaults


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


#: A real Argon2id hash of a value nobody can present, computed once at import.
#: Its only job is to cost the same as a genuine verify — see `waste_time`.
_DUMMY_HASH = _hasher.hash("bcb1b1e0-none-of-your-business-9f4c7a2d")


def waste_time() -> None:
    """Spend one password verification without having a password to check.

    Login must take the same time whether or not the address exists. Without
    this, `verify_password` is only reached when a user row was found, so an
    unknown address answers in about a millisecond and a known one takes the
    full Argon2id verify — and that difference is measurable from anywhere on
    the internet. It turns the login endpoint into a query interface for
    "is this person a BillGen customer", which is a disclosure about *their*
    business, not ours.

    Argon2 is deliberately slow, so the cost of the fix is exactly the cost of
    the attack it removes.
    """
    verify_password(_DUMMY_HASH, "")
