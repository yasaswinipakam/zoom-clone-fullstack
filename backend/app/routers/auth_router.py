"""Optional authentication endpoints kept separate from meeting routes."""

from fastapi import APIRouter, Depends, Header, status

from app.dependencies import get_auth_service
from app.core.exceptions import AuthenticationError
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _response(service: AuthService, user) -> AuthResponse:
    return AuthResponse(access_token=service.create_token(user), user=UserResponse.model_validate(user))


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, service: AuthService = Depends(get_auth_service)) -> AuthResponse:
    return _response(service, service.signup(payload))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)) -> AuthResponse:
    return _response(service, service.authenticate(payload))


@router.get("/me", response_model=UserResponse)
def current_user(
    authorization: str | None = Header(default=None),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    if authorization is None or not authorization.startswith("Bearer "):
        raise AuthenticationError("A bearer token is required.")
    return UserResponse.model_validate(service.get_user_from_token(authorization.removeprefix("Bearer ")))
