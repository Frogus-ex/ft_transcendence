import redis

from src.config import REDIS_HOST, REDIS_PASSWORD, REDIS_PORT

pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=REDIS_PORT,
    username="default",
    password=REDIS_PASSWORD or None,
    db=0,
    decode_responses=True,
    protocol=2,
)

r = redis.Redis(connection_pool=pool)
ts = r.ts()