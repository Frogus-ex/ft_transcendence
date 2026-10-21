import json
import logging
from decimal import Decimal
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status
from datetime import datetime
import redis.asyncio as aredis
from auth_deps import get_current_user_id

from config import JWT_SECRET
from database.models import Users, Portfolio, Order
from database.orm_db import get_async_session
from utils import Symbol, get_redis, limiter


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["Orders"])

ALGORITHM = "HS256"
bearer_scheme = HTTPBearer()
db_dependency = Annotated[AsyncSession, Depends(get_async_session)]


class OrderRequest(BaseModel):
	symbol: Symbol
	side: Literal["buy", "sell"]
	type: Literal["market", "limit"] = "market"
	quantity: float = Field(gt=0)


class OrderOut(BaseModel):
	id: int
	symbol: str
	side: str
	quantity: Decimal
	price: Decimal
	realized_pnl: Optional[Decimal]
	status: str
	created_at: datetime


def decode_user_id(credentials: HTTPAuthorizationCredentials) -> int:
	try:
		payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
		return int(payload["sub"])
	except (JWTError, KeyError, ValueError):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user.")


async def get_current_price(symbol: str, r: aredis.Redis) -> Decimal:
	last = await r.ts().get(f"ts:{symbol}:ticks")
	if not last:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No live price available for this symbol.")
	return Decimal(str(last[1]))


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def place_order(
	request: Request,
	order_request: OrderRequest,
	user_id: Annotated[int, Depends(get_current_user_id)],	db: db_dependency,
	r: aredis.Redis = Depends(get_redis),
):
	"""Places a market order and updates the user's portfolio accordingly.
	Limit/Stop Loss/Take Profit are accepted on the form but not executed yet."""

	if order_request.type != "market":
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Only market orders are supported for now.",
		)

	result = await db.execute(select(Portfolio).where(Portfolio.user_id == user_id).with_for_update())
	portfolio = result.scalar_one_or_none()
	if portfolio is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")

	price = await get_current_price(order_request.symbol, r)
	quantity = Decimal(str(order_request.quantity))
	positions: list[dict] = json.loads(portfolio.positions or "[]")
	existing = next((p for p in positions if p["symbol"] == order_request.symbol), None)
	realized_pnl: Optional[Decimal] = None

	if order_request.side == "buy":
		cost = quantity * price
		if cost > portfolio.cash_balance:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient balance.")

		portfolio.cash_balance -= cost

		if existing:
			old_qty = Decimal(str(existing["quantity"]))
			old_entry = Decimal(str(existing["entryPrice"]))
			new_qty = old_qty + quantity
			new_entry = (old_qty * old_entry + quantity * price) / new_qty
			existing["quantity"] = float(new_qty)
			existing["entryPrice"] = float(new_entry)
		else:
			positions.append({
				"symbol": order_request.symbol,
				"quantity": float(quantity),
				"entryPrice": float(price),
			})

	else:  # sell
		if not existing or Decimal(str(existing["quantity"])) < quantity:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient position.")

		entry_price = Decimal(str(existing["entryPrice"]))
		realized_pnl = (price - entry_price) * quantity
		portfolio.cash_balance += quantity * price

		remaining = Decimal(str(existing["quantity"])) - quantity
		if remaining <= 0:
			positions = [p for p in positions if p["symbol"] != order_request.symbol]
		else:
			existing["quantity"] = float(remaining)

	portfolio.positions = json.dumps(positions)

	new_order = Order(
		user_id=user_id,
		symbol=order_request.symbol,
		side=order_request.side,
		quantity=quantity,
		price=price,
		realized_pnl=realized_pnl,
		status="filled",
	)
	db.add(new_order)
	await db.commit()
	await db.refresh(new_order)

	return new_order


@router.get("", response_model=list[OrderOut])
async def list_orders(
	user_id: Annotated[int, Depends(get_current_user_id)],	db: db_dependency,
):
	result = await db.execute(
		select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc()).limit(200)
	)
	return result.scalars().all()