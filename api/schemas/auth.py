from uuid import UUID

from pydantic import BaseModel, Field

_EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class SignupRequest(BaseModel):
    email: str = Field(min_length=6, max_length=320, pattern=_EMAIL_PATTERN)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=200)
    organization_name: str = Field(min_length=1, max_length=200)


class LoginRequest(BaseModel):
    email: str = Field(min_length=6, max_length=320, pattern=_EMAIL_PATTERN)
    password: str = Field(min_length=1, max_length=128)
    organization_id: UUID | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


class MembershipOut(BaseModel):
    organization_id: UUID
    role: str


class SignupResponse(BaseModel):
    user_id: UUID
    email: str
    display_name: str
    organization_id: UUID
    organization_name: str
    tokens: TokenResponse


class LoginResponse(BaseModel):
    user_id: UUID
    email: str
    display_name: str
    organization_id: UUID
    role: str
    memberships: list[MembershipOut]
    tokens: TokenResponse
