import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from config import JWT_SECRET
from database.models import Users, Portfolio, Order
from database.orm_db import get_async_session


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users/me", tags=["GDPR"])

ALGORITHM = "HS256"
bearer_scheme = HTTPBearer()
db_dependency = Annotated[AsyncSession, Depends(get_async_session)]


def decode_user_id(credentials: HTTPAuthorizationCredentials) -> int:
	try:
		payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
		return int(payload["sub"])
	except (JWTError, KeyError, ValueError):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")


def default_json(obj):
	if isinstance(obj, (datetime, Decimal)):
		return str(obj)
	raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


@router.get("/export")
async def export_my_data(
	credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
	db: db_dependency,
):
	"""Exports every piece of personal data the platform holds about the caller (GDPR)."""

	user_id = decode_user_id(credentials)

	user = (await db.execute(select(Users).where(Users.id == user_id))).scalar_one_or_none()
	if user is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

	portfolio = (await db.execute(select(Portfolio).where(Portfolio.user_id == user_id))).scalar_one_or_none()
	orders = (
		await db.execute(select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc()))
	).scalars().all()

	data = {
		"user": {
			"id": user.id,
			"username": user.username,
			"email": user.email,
			"avatar_url": user.avatar_url,
			"created_at": user.created_at,
		},
		"portfolio": {
			"cash_balance": portfolio.cash_balance,
			"positions": portfolio.positions,
		} if portfolio else None,
		"orders": [
			{
				"id": o.id,
				"symbol": o.symbol,
				"side": o.side,
				"quantity": o.quantity,
				"price": o.price,
				"realized_pnl": o.realized_pnl,
				"status": o.status,
				"created_at": o.created_at,
			}
			for o in orders
		],
	}

	return Response(
		content=json.dumps(data, default=default_json, indent=2),
		media_type="application/json",
		headers={"Content-Disposition": 'attachment; filename="mes_donnees.json"'},
	)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
	credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
	db: db_dependency,
):
	"""Permanently deletes the caller's account and all associated data (GDPR right to erasure)."""

	user_id = decode_user_id(credentials)

	user = (await db.execute(select(Users).where(Users.id == user_id))).scalar_one_or_none()
	if user is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

	await db.delete(user)
	await db.commit()