import json
import pyotp
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from datetime import timedelta, datetime, timezone
from jose import jwt, JWTError
from typing import Annotated
from passlib.context import CryptContext
from utils import limiter
from auth_deps import get_current_user_id

from starlette import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import Users, Portfolio
from database.orm_db import get_async_session
from config import JWT_SECRET

router = APIRouter(prefix="/api", tags=["auth"])

ALGORITHM = 'HS256'

#Password hashing
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
bearer_scheme = HTTPBearer()

class CreateUserRequest(BaseModel):
	email: EmailStr
	username: str = Field(min_length=3, max_length=50)
	password: str = Field(min_length=8, max_length=72)

class RegisterResponse(BaseModel):
	userId: int

class LoginRequest(BaseModel):
	email: EmailStr
	password: str

class UserOut(BaseModel):
	model_config = ConfigDict(from_attributes=True)
	id: int
	username: str
	avatarUrl: str | None = Field(default=None, validation_alias="avatar_url")
	twoFactorEnabled: bool = Field(validation_alias="two_fa_enabled")

	@field_validator("avatarUrl", mode="before")
	@classmethod
	def resolve_default_avatar(cls, value: str | None) -> str:
		if value in (None, "https://i.pravatar.cc/150", "../images/Default_pfp.jpg"):
			return "/images/Default_pfp.jpg"
		return value

class UserMeOut(UserOut):
	email: str
	createdAt: datetime = Field(validation_alias="created_at")

class UpdateProfileRequest(BaseModel):
	model_config = ConfigDict(str_strip_whitespace=True)
	username: str = Field(min_length=3, max_length=50)

class LoginResponse(BaseModel):
	token: str | None = None
	user: UserOut | None = None
	requires2fa: bool = False
	tempToken: str | None = None

class RefreshResponse(BaseModel):
	token: str

class TwoFACode(BaseModel):
	code: str = Field(pattern=r"^\d{6}$")

class TwoFAVerifyRequest(TwoFACode):
	tempToken: str

class TwoFASetupResponse(BaseModel):
	otpauthUrl: str
	secret: str

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
				return [parsed] if parsed else []
			return []
		return value

db_dependency = Annotated[AsyncSession, Depends(get_async_session)]


# Register new user
@router.post("/auth/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse)
async def register(db: db_dependency,
                   create_user_request: CreateUserRequest):
	password_hash = await run_in_threadpool(bcrypt_context.hash, create_user_request.password)
	user = Users(
		email=create_user_request.email.strip().lower(),
		username=create_user_request.username.strip(),
		password_hash=password_hash,
		avatar_url="/images/Default_pfp.jpg",
	)
	db.add(user)
	try:
		await db.flush()
		db.add(Portfolio(user_id=user.id))
		await db.commit()
	except IntegrityError:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT,
		                    detail="Email or username already in use")
	return {"userId": user.id}

# Login to existing account
async def authenticate_user(email: str, password:str, db):
	result = await db.execute(select(Users).where(Users.email == email.strip().lower()))
	user = result.scalar_one_or_none()
	if user is None:
		return None
	ok = await run_in_threadpool(bcrypt_context.verify, password, user.password_hash)
	return user if ok else None

def create_access_token(email: str, id: int, expires_delta: timedelta, token_type: str = "access"):
	encode = {"sub": str(id), "email": email, "type": token_type, "exp": datetime.now(timezone.utc) + expires_delta,}
	return jwt.encode(encode, JWT_SECRET, algorithm=ALGORITHM)

def set_refresh_cookie(response: Response, user: Users):
	refresh_token = create_access_token(user.email, user.id, timedelta(days=7), token_type="refresh")
	response.set_cookie(
		key="refreshToken",
		value=refresh_token,
		max_age=7 * 24 * 60 * 60,
		httponly=True,
		secure=True,
		samesite="lax",
		path="/api/auth",
	)

async def _get_user_or_401(db: AsyncSession, user_id: int) -> Users:
	user = await db.get(Users, user_id)
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	return user

@router.post("/auth/login", status_code=status.HTTP_200_OK, response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest, response: Response, db: db_dependency):
	user = await authenticate_user(req.email, req.password, db)
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	if user.two_fa_enabled:
		temp_token = create_access_token(user.email, user.id, timedelta(minutes=5), token_type="2fa_pending")
		return {"requires2fa": True, "tempToken": temp_token}
	token = create_access_token(user.email, user.id, timedelta(minutes=20))
	set_refresh_cookie(response, user)
	return {"token": token, "user": user}

@router.post("/auth/refresh", response_model=RefreshResponse)
@limiter.limit("10/minute")
async def refresh_access_token(request: Request, db: db_dependency):
	refresh_token = request.cookies.get("refreshToken")
	if not refresh_token:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired, please log in again.")

	try:
		payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[ALGORITHM])
		if payload.get("type") != "refresh":
			raise ValueError("wrong token type")
		user_id = int(payload["sub"])
	except (JWTError, KeyError, TypeError, ValueError):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired, please log in again.")

	user = await _get_user_or_401(db, user_id)
	token = create_access_token(user.email, user.id, timedelta(minutes=20))
	return {"token": token}

@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
	response.delete_cookie(key="refreshToken", path="/api/auth", secure=True, httponly=True, samesite="lax")

# Request authorization header, 
# Response { id, username, email, avatarUrl, createdAt }

@router.get("/users/me", response_model=UserMeOut)
async def profile(user_id: Annotated[int, Depends(get_current_user_id)], db: db_dependency):
	result = await db.execute(select(Users).where(Users.id == user_id))
	user = result.scalar_one_or_none()
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	return user


@router.put("/users/me", response_model=UserMeOut)
@limiter.limit("10/minute")
async def update_profile(
	request: Request,
	update: UpdateProfileRequest,
	user_id: Annotated[int, Depends(get_current_user_id)],
	db: db_dependency,
):
	result = await db.execute(select(Users).where(Users.id == user_id))
	user = result.scalar_one_or_none()
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")

	user.username = update.username
	try:
		await db.commit()
	except IntegrityError:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already in use")
	await db.refresh(user)
	return user


@router.get("/portfolio", response_model=PortfolioOut)
async def get_portfolio(user_id: Annotated[int, Depends(get_current_user_id)], db: db_dependency):
	result = await db.execute(select(Portfolio).where(Portfolio.user_id == user_id))
	portfolio = result.scalar_one_or_none()
	if portfolio is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
	return portfolio

@router.post("/auth/2fa/setup", response_model=TwoFASetupResponse)
async def setup_2fa(user_id: Annotated[int, Depends(get_current_user_id)], db: db_dependency):
	user = await _get_user_or_401(db, user_id)
	if user.two_fa_enabled:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA already enabled.")
	secret = pyotp.random_base32()
	url = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="ft_transcendence")
	user.totp_secret = secret
	await db.commit()
	return {"otpauthUrl": url, "secret": secret}


@router.post("/auth/2fa/enable")
@limiter.limit("5/minute")
async def enable_2fa(request: Request, body: TwoFACode, user_id: Annotated[int, Depends(get_current_user_id)], db: db_dependency):
	user = await _get_user_or_401(db, user_id)
	if not user.totp_secret or not pyotp.TOTP(user.totp_secret).verify(body.code, valid_window=1):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code.")
	user.two_fa_enabled = True
	await db.commit()
	return {"twoFactorEnabled": True}


@router.post("/auth/2fa/disable")
@limiter.limit("5/minute")
async def disable_2fa(request: Request, body: TwoFACode, user_id: Annotated[int, Depends(get_current_user_id)], db: db_dependency):
	user = await _get_user_or_401(db, user_id)
	if not user.two_fa_enabled or not pyotp.TOTP(user.totp_secret).verify(body.code, valid_window=1):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code.")
	user.two_fa_enabled = False
	user.totp_secret = None
	await db.commit()
	return {"twoFactorEnabled": False}


@router.post("/auth/2fa/verify", response_model=LoginResponse)
@limiter.limit("5/minute")
async def verify_2fa(request: Request, body: TwoFAVerifyRequest, response: Response, db: db_dependency):
	try:
		payload = jwt.decode(body.tempToken, JWT_SECRET, algorithms=[ALGORITHM])
		if payload.get("type") != "2fa_pending":
			raise ValueError("wrong token type")
		user_id = int(payload["sub"])
	except (JWTError, KeyError, ValueError):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired, please log in again.")
	user = await _get_user_or_401(db, user_id)
	if not user.two_fa_enabled or not pyotp.TOTP(user.totp_secret).verify(body.code, valid_window=1):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code.")
	token = create_access_token(user.email, user.id, timedelta(minutes=20))
	set_refresh_cookie(response, user)
	return {"token": token, "user": user}
