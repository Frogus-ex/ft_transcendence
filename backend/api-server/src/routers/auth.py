from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from datetime import timedelta, datetime, timezone
from jose import jwt, JWTError
from typing import Annotated
from passlib.context import CryptContext

from starlette import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import Users, Wallet
from database.orm_db import get_async_session

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = 
ALGORITHM = 'HS256'

#Password hashing
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_bearer = OAuth2PasswordBearer(tokenUrl='api/token')

class CreateUserRequest(BaseModel):
	email: str
	username: str
	password_hash: str

class RegisterResponse(BaseModel):
	userId: int

class Token(BaseModel):
	access_token: str
	token_type: str

db_dependency = Annotated[AsyncSession, Depends(get_async_session)]


# Register new user
@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse)
async def register(db: db_dependency,
                   create_user_request: CreateUserRequest):
	user = Users(
		email=create_user_request.email,
		username=create_user_request.username,
		password_hash=bcrypt_context.hash(create_user_request.password_hash),
		avatar_url="https://i.pravatar.cc/150",
	)
	db.add(user)
	try:
		await db.flush()
		db.add(Wallet(user_id=user.id))
		await db.commit()
	except IntegrityError:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT,
		                    detail="Email or username already in use")
	return {"userId": user.id}

# Login to existing account

class LoginRequest(BaseModel):
	email: str
	password:str

async def authenticate_user(email: str, password:str, db):
	result = await db.execute(select(Users).where(Users.email == email.strip().lower()))
	user = result.scalar_one_or_none();
	if user is None:
		return None
	ok = await run_in_threadpool(bcrypt_context.verify, password, user.password_hash)
	return user if ok else None

def create_access_token(email: str, id: int, expires_delta: timedelta):
	encode = {"sub": str(id), "email": email, "exp": datetime.now(timezone.utc) + expires_delta,}
	return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login", status_code=status.HTTP_200_OK, response_model={Token, Users})
async def login(req: LoginRequest, db: db_dependency):
	user = await authenticate_user(req.email, req.password, db)
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.",)
	token = create_access_token(user.email, user.id, timedelta(minutes=20))
	return {"token": token, "user": user}

# Request authorization header, 
# Response { id, username, email, avatarUrl, createdAt }
@router.get("users/me")
def profile():
	return {"Hello World"}
