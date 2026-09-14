from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import Depends, APIRouter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import Ticker, MarketCandle, get_async_session
from schema import CandleValidation

router = APIRouter(prefix="/api/markets", tags=["Markets"])

# For watchlist
@router.get("")
async def   get_watchlist(session: AsyncSession = Depends(get_async_session)):
    """Gets the latest price of the currency and compare it to the price from 24-hrs ago"""

    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    symbols_query = select(Ticker.symbol).distinct()
    symbols_res = await session.execute(symbols_query)
    symbols = symbols_res.scalars().all()

    watchlist = []

    for symbol in symbols:
        # Getting the latest price of each currency
        latest_query = (
            select(Ticker.price)
            .where(Ticker.symbol == symbol)
            .order_by(Ticker.timestamp.desc())
            .limit(1)
        )
        latest_price = (await session.execute(latest_query)).scalar()

        # Getting the oldest price (24-hrs ago) of each currency
        old_query = (
            select(Ticker.price)
            .where(Ticker.symbol == symbol, Ticker.timestamp <= day_ago)
            .order_by(Ticker.timestamp.desc())
            .limit(1)
        )
        old_price = (await session.execute(old_query)).scalar()

        # Calculating price variation in percentage
        if latest_price and old_price and old_price > 0:
            change_24h = ((latest_price - old_price) / old_price) * 100
        else:
            change_24h = 0.0

        watchlist.append({
            "symbol": symbol,
            "lastPrice": latest_price,
            "change24h": round(change_24h, 2)
        })

    return watchlist

# HTTP Ticker, main graph (Database)
@router.get("/{symbol}/candles", response_model=List[CandleValidation])
async def   get_candles(
    symbol: str,
    interval: str = "1m",
    limit: int = 100,
    session: AsyncSession = Depends(get_async_session)
):
    """Collect the last x ticks (default 100) from the table "market_candles" with a given interval (default 1-min)"""

    query = (
        select(MarketCandle)
        .where(MarketCandle.symbol == symbol.upper(),
               MarketCandle.interval == interval
        )
        .order_by(MarketCandle.time.desc())
        .limit(limit)
    )

    # Getting tuple with result -> unpack it with .scalars() -> putting them in a list with .all()
    result = await session.execute(query)
    candles = result.scalars().all()
    # Returning all the tables but backwards (from the oldest to the latest)
    return candles[::-1]