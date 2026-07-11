"""Business rules for the optional JWT authentication bonus feature."""

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings
from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, SignupRequest


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    def signup(self, payload: SignupRequest) -> User:
        if self.user_repo.get_by_email(str(payload.email)) is not None:
            raise ConflictError("An account with this email already exists.")
        password_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
        user = self.user_repo.create(
            User(name=payload.name.strip(), email=str(payload.email), password_hash=password_hash)
        )
        self.user_repo.db.commit()
        return user

    def authenticate(self, payload: LoginRequest) -> User:
        user = self.user_repo.get_by_email(str(payload.email))
        if user is None or user.password_hash is None:
            raise AuthenticationError("Invalid email or password.")
        if not bcrypt.checkpw(payload.password.encode(), user.password_hash.encode()):
            raise AuthenticationError("Invalid email or password.")
        return user

    def create_token(self, user: User) -> str:
        expires_at = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
        return jwt.encode({"sub": str(user.id), "exp": expires_at}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    def get_user_from_token(self, token: str) -> User:
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            user_id = int(payload["sub"])
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as exc:
            raise AuthenticationError("Invalid or expired access token.") from exc
        user = self.user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Authenticated user was not found.")
        return user
