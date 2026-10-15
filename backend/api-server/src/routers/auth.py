import json
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from datetime import timedelta, datetime, timezone
from jose import jwt, JWTError
from typing import Annotated
from passlib.context import CryptContext

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
		avatar_url="https://i.pravatar.cc/150",
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

def create_access_token(email: str, id: int, expires_delta: timedelta):
	encode = {"sub": str(id), "email": email, "exp": datetime.now(timezone.utc) + expires_delta,}
	return jwt.encode(encode, JWT_SECRET, algorithm=ALGORITHM)

@router.post("/auth/login", status_code=status.HTTP_200_OK, response_model=LoginResponse)
async def login(req: LoginRequest, db: db_dependency):
	user = await authenticate_user(req.email, req.password, db)
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	token = create_access_token(user.email, user.id, timedelta(minutes=20))
	return {"token": token, "user": user}

# Request authorization header, 
# Response { id, username, email, avatarUrl, createdAt }
@router.get("/users/me", response_model=UserMeOut)
async def profile(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)], db: db_dependency):
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


@router.get("/portfolio", response_model=PortfolioOut)
async def get_portfolio(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)], db: db_dependency):
	try:
		payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
		user_id=int(payload["sub"])
	except (JWTError, KeyError, ValueError):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	
	result = await db.execute(select(Portfolio).where(Portfolio.user_id == user_id))
	portfolio = result.scalar_one_or_none()
	if portfolio is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
	return portfolio