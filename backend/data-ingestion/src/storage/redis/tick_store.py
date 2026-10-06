import json
import logging
from datetime import datetime

import redis

from src.bootstrap.celery import app
from src.bootstrap.redis import sync_r as r, sync_ts as ts

logger = logging.getLogger(__name__)


def date_time_encoder(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


@app.task(name="save_to_cache_and_publish")
def save_to_cache_and_publish(data: dict) -> None:
    """Saving the cleaned data into Redis cache and publish it to FastAPI."""
    symbol = data["symbol"]
    price = data["price"]
    quantity = data["quantity"]
    timestamp_ms = int(data["timestamp"].timestamp() * 1000)

    ticks_key = f"ts:{symbol}:ticks"
    volume_key = f"ts:{symbol}:volume_ticks"
    cache_key = f"cache:{symbol}:latest"

    channel = "market_ticks_channel"
    message = json.dumps(data, default=date_time_encoder)

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
    except redis.exceptions.RedisError as exc:
        logger.error(f"Redis Error: {exc}")
    except Exception as exc:
        logger.error(f"Error: {exc}")