import json
import redis
import os
from datetime import datetime

# Getting environment from Docker compose
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

# Initializing Redis client
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

class   DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime)):
            return obj.isoformat()
        return super().default(obj)

def save_to_redis(data: dict) -> None :
    symbol = data["symbol"]
    key = f"Ticker{symbol}"

    # Saving the cleaned data into json format
    r.set(key, json.dumps(data, cls=DateTimeEncoder))