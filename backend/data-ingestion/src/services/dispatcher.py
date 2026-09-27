from database.redis_client import TIMEFRAMES
from database.orm_db import market_candles, engine
from sqlalchemy.dialects.postgresql import insert
from tasks import app
import redis
import json
from config import REDIS_HOST, REDIS_PASSWORD, REDIS_PORT
from decimal import Decimal
from datetime import datetime, timezone
import time
import logging

logger = logging.getLogger(__name__)


pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=REDIS_PORT,
    username="default",
    password=REDIS_PASSWORD,
    db=0,
    decode_responses=True,
    protocol=2
)

r = redis.Redis(connection_pool=pool)

ts = r.ts()

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
        logger.info(f"Pushed to Redis: {symbol} -> ${price}")
        ts.add(ticks_key, timestamp_ms, price)
        logger.info(f"Added to {ticks_key}: {timestamp_ms} -> ${price}")
        ts.add(volume_key, timestamp_ms, quantity)
        logger.info(f"Added to {volume_key}: {timestamp_ms} -> {quantity}")
        r.publish(channel, message)
        logger.info(f"Published to {channel}")
    except redis.exceptions.ConnectionError:
        pass
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis Error: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")


@app.task(name="process_and_dispatch")
def process_and_dispatch(cleaned_data: dict):
    """Process the cleaned data and dispatch it to Redis.

    This function is a Celery task so it can be executed by workers.
    It delegates cache publishing and DB writes to separate Celery tasks.
    """

    # Save the latest price in cache (run as a separate task)
    try:
        save_to_cache_and_publish.delay(cleaned_data)
    except Exception as e:
        logger.error(f"Failed to queue Redis publish task: {e}")


@app.task(name="persist_close_candles")
def persist_close_candles(symbol: str, timeframe: str):
    """Flush the latest closed price to Postgres"""

    bucket_ms = TIMEFRAMES[timeframe]
    now_ms = int(time.time() * 1000)
    bucket_end = (now_ms // bucket_ms) * bucket_ms # Latest closed bucket
    bucket_start = bucket_end - bucket_ms

    values = {}
    for field in ("open", "high", "low", "close"):
        dest_key = f"ts:{symbol}:ohlc:{timeframe}:{field}"
        points = ts.range(dest_key, bucket_start, bucket_end)
        if not points:
            return
        values[field] = Decimal(str(points[-1][1])) # (timestamp, value) -> value

    candle_time = datetime.fromtimestamp(bucket_start / 1000, tz=timezone.utc).replace(tzinfo=None)

    try:
        query = insert(market_candles).values(
            symbol=symbol,
            interval=timeframe,
            time=candle_time,
            volume=candle_time,
            **values,
        )
        query = query.on_conflict_do_update(
            index_elements=["symbol", "interval", "time"],
            set_=values,
        )

        with engine.begin() as conn:
            conn.execute(query)
    except Exception as e:
        logger.error(f"Error while inserting OHLC data: {e}")