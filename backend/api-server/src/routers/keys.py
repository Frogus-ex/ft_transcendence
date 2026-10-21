import secrets
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from auth_deps import get_current_user_id, get_session_user_id, hash_api_key
from database.models import ApiKey
from database.orm_db import get_async_session
from utils import limiter

router = APIRouter(prefix="/api/keys", tags=["API keys"])

db_dependency = Annotated[AsyncSession, Depends(get_async_session)]


class ApiKeyStatus(BaseModel):
	hasKey: bool
	prefix: Optional[str] = None
	createdAt: Optional[datetime] = None


class ApiKeyCreated(BaseModel):
	apiKey: str
	prefix: str


@router.get("", response_model=ApiKeyStatus)
async def get_key_status(user_id: Annotated[int, Depends(get_session_user_id)], db: db_dependency):
	"""Tells whether the user has an active API key (the key itself is never returned again)."""
	row = (await db.execute(select(ApiKey).where(ApiKey.user_id == user_id))).scalar_one_or_none()
	if row is None:
		return ApiKeyStatus(hasKey=False)
	return ApiKeyStatus(hasKey=True, prefix=row.key_prefix, createdAt=row.created_at)


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_key(
	request: Request,
	user_id: Annotated[int, Depends(get_session_user_id)],
	db: db_dependency,
):
	"""Generates a new API key (replacing any previous one). The key is shown only once."""
	raw_key = "tk_" + secrets.token_urlsafe(32)
	row = (await db.execute(select(ApiKey).where(ApiKey.user_id == user_id))).scalar_one_or_none()

	if row is None:
		db.add(ApiKey(user_id=user_id, key_hash=hash_api_key(raw_key), key_prefix=raw_key[:8]))
	else:
		row.key_hash = hash_api_key(raw_key)
		row.key_prefix = raw_key[:8]
		row.created_at = datetime.now(timezone.utc)

	await db.commit()
	return ApiKeyCreated(apiKey=raw_key, prefix=raw_key[:8])


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_key(user_id: Annotated[int, Depends(get_current_user_id)], db: db_dependency):
	"""Revokes the user's API key. Works with the session token or with the key itself."""
	await db.execute(delete(ApiKey).where(ApiKey.user_id == user_id))
	await db.commit()