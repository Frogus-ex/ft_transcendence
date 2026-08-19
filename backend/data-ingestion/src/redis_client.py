import json
import redis
import os
from datetime import datetime

# Getting environment from Docker compose
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# Initializing Redis client
r = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    db=0,
    decode_responses=True,
    protocol=2
)

def date_time_encoder(obj):
    if isinstance(obj, (datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

def save_to_cache(data: dict) -> None :
    symbol = data["symbol"]
    key = f"ticker:{symbol}"

    # Saving the cleaned data into json format
    r.set(key, json.dumps(data, default=date_time_encoder))