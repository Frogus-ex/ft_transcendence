import json
import redis
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Getting environment from Docker compose
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT"))
password_file_path = os.getenv("REDIS_PASSWORD_FILE")

if password_file_path and os.path.exists(password_file_path):
    try:
        with open(password_file_path, "r", encoding="utf-8") as p:
            REDIS_PASSWORD = p.read().strip()
    except OSError as exc:
        logger.warning(f"Unable to read Redis password file {password_file_path}: {exc}")
        REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
else:
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

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

def save_to_cache(data: dict) -> None :
    """Saving the cleaned data into Redis cache"""
    
    symbol = data["symbol"]
    key = f"ticker:{symbol}"

    # Saving the cleaned data into json format
    try:
        r.set(key, json.dumps(data, default=date_time_encoder))
    except redis.exceptions.ConnectionError:
        pass
    except redis.exceptions.RedisError as e:
        logger.error(f"Error while saving to Redis: {e}")