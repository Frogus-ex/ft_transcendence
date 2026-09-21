import json
import redis
import logging
from datetime import datetime
from tasks import app
from config import (
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
)

logger = logging.getLogger(__name__)

# Initializing Redis client
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

def date_time_encoder(obj):
    if isinstance(obj, (datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

@app.task(name="save_to_cache_and_publish")
def save_to_cache_and_publish(data: dict) -> None :
    """Saving the cleaned data into Redis cache and publish it to FastAPI"""
    
    symbol = data["symbol"]
    key = f"ticker:{symbol}"
    channel = "market_ticks_channel"
    message = json.dumps(data, default=date_time_encoder)

    # Saving the cleaned data into json format
    try:
        r.set(key, message)
        r.publish(channel, message)
    except redis.exceptions.ConnectionError:
        pass
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis Error: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")