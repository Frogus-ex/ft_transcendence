import logging
import time
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.dialects.postgresql import insert

from src.bootstrap.celery import app
from src.domain.market import MONDAY_ALIGN_MS, SYMBOLS, TIMEFRAMES
from src.storage.postgres import engine, market_candles
from src.storage.redis import ts

logger = logging.getLogger(__name__)

FIELDS = ("open", "high", "low", "close", "volume")


def last_closed_bucket_start(now_ms: int, bucket_ms: int, align_ms: int) -> int:
    """Calculates the start timestamp of the last closed bucket for a given timeframe."""
    open_bucket_start = ((now_ms - align_ms) // bucket_ms) * bucket_ms + align_ms
    return open_bucket_start - bucket_ms


def read_closed_candle(symbol: str, timeframe: str, now_ms: int) -> dict | None:
    """Only read the last closed candle"""

    bucket_ms = TIMEFRAMES[timeframe]
    align_ms = MONDAY_ALIGN_MS if timeframe == "1w" else 0
    bucket_start = last_closed_bucket_start(now_ms, bucket_ms, align_ms)

    values = {}
    for field in FIELDS:
        dest_key = f"ts:{symbol}:ohlc:{timeframe}:{field}"
        points = ts.range(dest_key, bucket_start, bucket_start)
        if not points:
            return None
        values[field] = Decimal(str(points[0][1]))

    return {
        "symbol": symbol,
        "interval": timeframe,
        "time": datetime.fromtimestamp(bucket_start / 1000, timezone.utc),
        **values,
    }


@app.task(name="persist_all_closed_candles")
def persist_all_closed_candles() -> None:
    """Periodic task (Celery Beat):
    persist the latest closed candles for all symbols and timeframes
    to Postgres in one query."""

    now_ms = int(time.time() * 1000)

    rows = []
    for symbol in SYMBOLS:
        for timeframe in TIMEFRAMES:
            try:
                candle = read_closed_candle(symbol, timeframe, now_ms)
                if candle:
                    rows.append(candle)
                    logger.info(f"Candle persisted: {symbol} {timeframe}")
            except Exception:
                logger.error(f"Failed to read candle from Redis: {symbol} {timeframe}")

    if not rows:
        logger.debug("persist_all_closed_candles: nothing to persist.")
        return

    query = insert(market_candles).values(rows)
    query = query.on_conflict_do_update(
        index_elements=["symbol", "interval", "time"],
        set_={field: getattr(query.excluded, field) for field in FIELDS},
        # Only writes lines that has changed
        where=(
            market_candles.c.open.is_distinct_from(query.excluded.open)
            | market_candles.c.high.is_distinct_from(query.excluded.high)
            | market_candles.c.low.is_distinct_from(query.excluded.low)
            | market_candles.c.close.is_distinct_from(query.excluded.close)
            | market_candles.c.volume.is_distinct_from(query.excluded.volume)
        ),
    )

    try:
        with engine.begin() as conn:
            res = conn.execute(query)
    except Exception as exc:
        logger.error(f"Error while inserting OHLC data: {exc}")

    logger.info(f"persist_all_closed_candles: {len(rows)} candle(s) read.")