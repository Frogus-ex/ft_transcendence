from datetime import datetime, time, timezone, timedelta
from pydantic import PositiveInt

from utils import CandleValidation
from database import MarketCandle
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional


async def fetch_candles(
    symbol: str,
    interval: str,
    limit: PositiveInt,
    session: AsyncSession,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> List[CandleValidation]:
    """Fetches candle data from the database for a given symbol and interval,
    optionally restricted to a [start, end] date range."""

    if start is not None and start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end is not None:
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        # une date seule (00:00) signifie "jusqu'à la fin de ce jour"
        if end.time() == time(0, 0):
            end = end + timedelta(days=1) - timedelta(microseconds=1)
    query = (
        select(MarketCandle)
        .where(MarketCandle.symbol == symbol.upper(),
               MarketCandle.interval == interval
        )
    )

    if start is not None:
        query = query.where(MarketCandle.time >= start)
    if end is not None:
        query = query.where(MarketCandle.time <= end)

    query = query.order_by(MarketCandle.time.desc()).limit(limit)

    result = await session.execute(query)
    candles = result.scalars().all()

    return [
        CandleValidation(
            symbol=c.symbol,
            interval=c.interval,
            time=c.time.isoformat(),
            open=c.open,
            high=c.high,
            low=c.low,
            close=c.close,
            volume=c.volume,
        )
        for c in reversed(candles)
    ]