from pydantic import PositiveInt

from utils import CandleValidation
from database import MarketCandle
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List


async def fetch_candles(
    symbol: str,
    interval: str,
    limit: PositiveInt,
    session: AsyncSession
) -> List[CandleValidation]:
    """Fetches candle data from the database for a given symbol and interval."""

    query = (
        select(MarketCandle)
        .where(MarketCandle.symbol == symbol.upper(),
               MarketCandle.interval == interval
        )
        .order_by(MarketCandle.time.desc())
        .limit(limit)
    )

    result = await session.execute(query)
    candles = result.scalars().all()

    # Converting everything here for get_candles() and export_market_data(),
    # both will receive CandleValidation serializable types from Pydantic
    # instead of ORM objects.
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