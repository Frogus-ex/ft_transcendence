import json
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from authlib.integrations.starlette_client import OAuth, OAuthError
from httpx import HTTPError
from datetime import timedelta, datetime, timezone
from jose import jwt, JWTError
from typing import Annotated, TypeAlias
from passlib.context import CryptContext
from utils import limiter

from starlette import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import Users, Portfolio
from database.orm_db import get_async_session
from config import JWT_SECRET, OAUTH_42_ID, OAUTH_42_SECRET, FRONTEND_URL


router = APIRouter(prefix="/api", tags=["auth"])

ALGORITHM = 'HS256'
MAX_PASSWORD_BYTES = 72
DEFAULT_PFP = "https://i.pravatar.cc/150"

#Password hashing
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
# False hash to let bcrypt work to avoid guessing which emails don't exist
DUMMY_HASH = bcrypt_context.hash("dummy-password")
bearer_scheme = HTTPBearer()


oauth = OAuth()
oauth.register(
	name="school",
	client_id= OAUTH_42_ID,
	client_secret=OAUTH_42_SECRET,
	authorize_url="https://api.intra.42.fr/oauth/authorize",
	access_token_url="https://api.intra.42.fr/oauth/token",
	api_base_url="https://api.intra.42.fr/",
	client_kwargs={"scope": "public"},
)


class CreateUserRequest(BaseModel):
	email: EmailStr
	username: str = Field(min_length=3, max_length=50)
	password: str = Field(min_length=8)

	@field_validator("password")
	@classmethod
	def check_password_bcrypt(cls, value: str) -> str:
		if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
			raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes.")
		return value


class RegisterResponse(BaseModel):
	userId: int


class LoginRequest(BaseModel):
	email: str
	password:str


class UserOut(BaseModel):
	model_config = ConfigDict(from_attributes=True)
	id: int
	username: str
	avatarUrl: str | None = Field(default=None, validation_alias="avatar_url")


class UserMeOut(UserOut):
	email: str
	createdAt: datetime = Field(validation_alias="created_at")


class UpdateProfileRequest(BaseModel):
	model_config = ConfigDict(str_strip_whitespace=True)
	username: str = Field(min_length=3, max_length=50)


class LoginResponse(BaseModel):
	token: str
	user: UserOut


class PortfolioOut(BaseModel):
	model_config = ConfigDict(from_attributes=True)
	id: int
	user_id: int
	balance: Decimal = Field(validation_alias="cash_balance")
	positions: list[dict] = Field(default_factory=list)

	@field_validator("positions", mode="before")
	@classmethod
	def parse_positions(cls, value):
		if value is None:
			return []
		if isinstance(value, str):
			try:
				parsed = json.loads(value)
			except (TypeError, ValueError):
				return []
			if isinstance(parsed, list):
				return parsed
			if isinstance(parsed, dict):
				return [parsed]
			return []
		return value


db_dependency: TypeAlias = Annotated[AsyncSession, Depends(get_async_session)]


async def save_new_user(db: AsyncSession, user: Users) -> None:
	db.add(user)
	try:
		await db.flush()
		db.add(Portfolio(user_id=user.id))
		await db.commit()
	except IntegrityError as exc:
		await db.rollback()
		print(f"IntegrityError: {exc.orig}")
		raise HTTPException(status_code=status.HTTP_409_CONFLICT,
		                    detail="Email or username already in use")


# Register new user
@router.post("/auth/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse)
@limiter.limit("10/hour")
async def register(request: Request,
                   db: db_dependency,
                   create_user_request: CreateUserRequest):
	password_hash = await run_in_threadpool(bcrypt_context.hash, create_user_request.password)
	user = Users(
		email=create_user_request.email.strip().lower(),
		username=create_user_request.username.strip(),
		password_hash=password_hash,
		avatar_url=DEFAULT_PFP,
	)
	await save_new_user(db, user)
	return {"userId": user.id}


# Login to existing account
async def authenticate_user(email: str, password:str, db):
	if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
		return None
	result = await db.execute(select(Users).where(Users.email == email.strip().lower()))
	user = result.scalar_one_or_none()
	if user is None or user.password_hash is None:
		await run_in_threadpool(bcrypt_context.verify, password, DUMMY_HASH)
		return None
	ok = await run_in_threadpool(bcrypt_context.verify, password, user.password_hash)
	return user if ok else None


def create_access_token(email: str, id: int, expires_delta: timedelta):
	encode = {"sub": str(id), "email": email, "exp": datetime.now(timezone.utc) + expires_delta,}
	return jwt.encode(encode, JWT_SECRET, algorithm=ALGORITHM)


@router.post("/auth/login", status_code=status.HTTP_200_OK, response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest, db: db_dependency):
	user = await authenticate_user(req.email, req.password, db)
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	token = create_access_token(user.email, user.id, timedelta(minutes=20))
	return {"token": token, "user": user}


@router.get("/auth/school/login")
async def school_login(request: Request):
	redirect_uri = str(request.url_for("school_callback"))
	return await oauth.school.authorize_redirect(request, redirect_uri)


@router.get("/auth/school/callback", name="school_callback")
async def school_callback(request: Request, db: db_dependency):
	try:
		token = await oauth.school.authorize_access_token(request)
		resp = await oauth.school.get("v2/me", token=token)
		resp.raise_for_status()
		me = resp.json()
	except (OAuthError, HTTPError):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth login failed.")

	school_id = str(me["id"])

	result = await db.execute(select(Users).where(Users.school_id == school_id))
	user = result.scalar_one_or_none()

	if user is None:
		email = (me.get("email") or f"{school_id}@school.oauth.invalid").lower()

		# No email merge
		taken = await db.execute(select(Users.id).where(Users.email == email))
		if taken.first() is not None:
			raise HTTPException(status_code=status.HTTP_409_CONFLICT,
			                    detail="An account already exists with this email. Log in with your password.")

		username = me["login"]
		name_taken = await db.execute(select(Users.id).where(Users.username == username))
		if name_taken.first() is not None:
			username = f"{username}_school"

		user = Users(
			email=email,
			username=username,
			password_hash=None,
			avatar_url=DEFAULT_PFP,
			school_id=school_id,
		)
		await save_new_user(db, user)

	token = create_access_token(user.email, user.id, timedelta(minutes=20))

	return RedirectResponse(f"{FRONTEND_URL}/oauth-callback#token={token}",
		                    status_code=status.HTTP_302_FOUND)


async def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
                           db: db_dependency) -> Users:
	try:
		payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
		user_id=int(payload["sub"])
	except (JWTError, KeyError, ValueError):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	
	result = await db.execute(select(Users).where(Users.id == user_id))
	user = result.scalar_one_or_none()
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	return user


CurrentUser: TypeAlias = Annotated[Users, Depends(get_current_user)]


# Request authorization header, 
# Response { id, username, email, avatarUrl, createdAt }
@router.get("/users/me", response_model=UserMeOut)
async def profile(user: CurrentUser):
	return user


@router.get("/portfolio", response_model=PortfolioOut)
async def get_portfolio(user: CurrentUser, db: db_dependency):
	result = await db.execute(select(Portfolio).where(Portfolio.user_id == user.id))
	portfolio = result.scalar_one_or_none()
	if portfolio is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
	return portfolio