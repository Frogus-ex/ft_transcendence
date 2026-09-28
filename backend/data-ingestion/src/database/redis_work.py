from database.redis_client import TIMEFRAMES
from database.orm_db import market_candles, engine
from sqlalchemy.dialects.postgresql import insert
import redis
import json
from config import REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, MONDAY_ALIGN_MS, SYMBOLS
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import text
import logging
import time
from tasks import app


logger = logging.getLogger(__name__)

pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=REDIS_PORT,
    username="default",
    password=REDIS_PASSWORD or None,
    db=0,
    decode_responses=True,
    protocol=2
)

r = redis.Redis(connection_pool=pool)

ts = r.ts()

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


def date_time_encoder(obj):
    if isinstance(obj, (datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")



@app.task(name="save_to_cache_and_publish")
def save_to_cache_and_publish(data: dict) -> None :
    """Saving the cleaned data into Redis cache and publish it to FastAPI"""

    symbol = data["symbol"]
    price = data["price"]
    quantity = data["quantity"]
    timestamp_ms = int(data["timestamp"].timestamp() * 1000)

    ticks_key = f"ts:{symbol}:ticks"
    volume_key = f"ts:{symbol}:volume_ticks"
    # Distinct key from TimeSeries key above
    cache_key = f"cache:{symbol}:latest"

    channel = "market_ticks_channel"
    message = json.dumps(data, default=date_time_encoder)

    # Saving the cleaned data into json format
    try:
        r.set(cache_key, message)
        logger.debug(f"Pushed to Redis: {symbol} -> ${price}")
        ts.add(ticks_key, timestamp_ms, price)
        logger.debug(f"Added to {ticks_key}: {timestamp_ms} -> ${price}")
        ts.add(volume_key, timestamp_ms, quantity)
        logger.debug(f"Added to {volume_key}: {timestamp_ms} -> {quantity}")
        r.publish(channel, message)
        logger.debug(f"Published to {channel}")
    except redis.exceptions.ConnectionError:
        pass
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis Error: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")


def last_closed_bucket_start(now_ms: int, bucket_ms: int, align_ms: int) -> int:
    """Calculates the start timestamp of the last closed bucket for a given timeframe."""

    open_bucket_start = ((now_ms - align_ms) // bucket_ms) * bucket_ms + align_ms
    return open_bucket_start - bucket_ms


@app.task(name="persist_candles")
def persist_candles(symbol: str, timeframe: str, now_ms: int):
    """Flush the latest closed price to Postgres"""

    bucket_ms = TIMEFRAMES[timeframe]
    align_ms = MONDAY_ALIGN_MS if timeframe == "1w" else 0
    bucket_start = last_closed_bucket_start(now_ms, bucket_ms, align_ms)

    values = {}
    for field in FIELDS:
        dest_key = f"ts:{symbol}:ohlc:{timeframe}:{field}"
        points = ts.range(dest_key, bucket_start, bucket_start)
        if not points:
            return False
        values[field] = Decimal(str(points[0][1])) # (timestamp, value) -> value

    candle_time = datetime.fromtimestamp(bucket_start / 1000, tz=timezone.utc)

    try:
        with engine.begin() as conn:
            row = conn.execute(
                UPSERT,
                {"symbol": symbol, "interval": timeframe, "time": candle_time, **values},
            ).first()
    except Exception as e:
        logger.error(f"Error while inserting OHLC data: {e}")

    return bool(row and row.inserted)


@app.task(name="persist_all_closed_candles")
def persist_all_closed_candles() -> None:
    """Persist the latest closed candles for all symbols and timeframes to Postgres"""

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