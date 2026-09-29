import logging
import time
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import text

from src.bootstrap.celery import app
from src.domain.market import MONDAY_ALIGN_MS, SYMBOLS, TIMEFRAMES
from src.storage.postgres import engine
from src.storage.redis import ts

logger = logging.getLogger(__name__)

FIELDS = ("open", "high", "low", "close", "volume")

UPSERT = text("""
    INSERT INTO market_candles
        (symbol, interval, time, open, high, low, close, volume)
    VALUES
        (:symbol, :interval, :time, :open, :high, :low, :close, :volume)
    ON CONFLICT (symbol, interval, time) DO UPDATE
    SET open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume
    WHERE (market_candles.open, market_candles.high, market_candles.low,
        market_candles.close, market_candles.volume)
        IS DISTINCT FROM
        (EXCLUDED.open, EXCLUDED.high, EXCLUDED.low, EXCLUDED.close, EXCLUDED.volume)
    RETURNING (xmax = 0) AS inserted
""")


def last_closed_bucket_start(now_ms: int, bucket_ms: int, align_ms: int) -> int:
    """Calculates the start timestamp of the last closed bucket for a given timeframe."""
    open_bucket_start = ((now_ms - align_ms) // bucket_ms) * bucket_ms + align_ms
    return open_bucket_start - bucket_ms


@app.task(name="persist_candles")
def persist_candles(symbol: str, timeframe: str, now_ms: int):
    """Flush the latest closed price to Postgres."""
    bucket_ms = TIMEFRAMES[timeframe]
    align_ms = MONDAY_ALIGN_MS if timeframe == "1w" else 0
    bucket_start = last_closed_bucket_start(now_ms, bucket_ms, align_ms)

    values = {}
    for field in FIELDS:
        dest_key = f"ts:{symbol}:ohlc:{timeframe}:{field}"
        points = ts.range(dest_key, bucket_start, bucket_start)
        if not points:
            return False
        values[field] = Decimal(str(points[0][1]))

    candle_time = datetime.fromtimestamp(bucket_start / 1000, tz=timezone.utc)

    try:
        with engine.begin() as conn:
            row = conn.execute(
                UPSERT,
                {"symbol": symbol, "interval": timeframe, "time": candle_time, **values},
            ).first()
    except Exception as exc:
        logger.error(f"Error while inserting OHLC data: {exc}")
        return False

    return bool(row and row.inserted)


@app.task(name="persist_all_closed_candles")
def persist_all_closed_candles() -> None:
    """Persist the latest closed candles for all symbols and timeframes to Postgres."""
    now_ms = int(time.time() * 1000)
    inserted = 0

    for symbol in SYMBOLS:
        for timeframe in TIMEFRAMES:
            try:
                if persist_candles(symbol, timeframe, now_ms):
                    inserted += 1
                    logger.info(f"Candle persisted: {symbol} {timeframe}")
            except Exception:
                logger.error(f"Failed to persist candle: {symbol} {timeframe}")

    logger.debug(f"persist_all_closed_candles done, {inserted} new candle(s)")