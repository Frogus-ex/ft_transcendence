import time
from typing import List
from fastapi import Depends, APIRouter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aredis

from database import MarketCandle, get_async_session
from utils import CandleValidation, get_redis
from config import DAY_MS, HOURS_MS, SYMBOLS


router = APIRouter(prefix="/api/markets", tags=["Markets"])


# For watchlist
@router.get("")
async def   get_watchlist(r: aredis.Redis = Depends(get_redis)):
    """Gets the latest price of the currency and compare it to the price from 24-hrs ago"""

    ts = r.ts()
    now_ms = int(time.time() * 1000)
    day_ago = ((now_ms - DAY_MS) // HOURS_MS) * HOURS_MS

    watchlist = []

    for symbol in SYMBOLS:
        # Getting the latest price of each currency
        last = await ts.get(f"ts:{symbol}:ticks")
        ref = await ts.range(
            f"ts:{symbol}:ohlc:1h:close",
            day_ago,
            day_ago,
        )

        if not last:
            continue

        latest_price = last[1]
        old_price = ref[0][1] if ref else None

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