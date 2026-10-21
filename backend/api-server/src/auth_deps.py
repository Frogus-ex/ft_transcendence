import hashlib
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from config import JWT_SECRET
from database.models import ApiKey
from database.orm_db import get_async_session

ALGORITHM = "HS256"
bearer_scheme = HTTPBearer(auto_error=False)
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


def hash_api_key(key: str) -> str:
	return hashlib.sha256(key.encode()).hexdigest()


def _user_id_from_token(credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[int]:
	if credentials is None:
		return None
	try:
		payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
		if payload.get("type") != "access":
			return None
		return int(payload["sub"])
	except (JWTError, KeyError, ValueError):
		return None


async def get_session_user_id(
	credentials: Annotated[Optional[HTTPAuthorizationCredentials], Security(bearer_scheme)],
) -> int:
	"""Session token only (used to manage API keys)."""
	user_id = _user_id_from_token(credentials)
	if user_id is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	return user_id


async def get_current_user_id(
	credentials: Annotated[Optional[HTTPAuthorizationCredentials], Security(bearer_scheme)],
	api_key: Annotated[Optional[str], Security(api_key_scheme)],
	db: Annotated[AsyncSession, Depends(get_async_session)],
) -> int:
	"""Authenticates the caller with either an X-API-Key header or a Bearer session token."""
	if api_key:
		result = await db.execute(select(ApiKey.user_id).where(ApiKey.key_hash == hash_api_key(api_key)))
		user_id = result.scalar_one_or_none()
		if user_id is None:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key.")
		return user_id

	user_id = _user_id_from_token(credentials)
	if user_id is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")
	return user_id