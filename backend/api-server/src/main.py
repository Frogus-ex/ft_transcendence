import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import redis.asyncio as aredis

from config import REDIS_PORT, REDIS_HOST, REDIS_PASSWORD
from connection_manager import manager
from routers import markets, websockets

logging.basicConfig(
	level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Creating Redis pool
@asynccontextmanager
async def   lifespan(app: FastAPI):
    """Creating a connection pool and a client for Redis before starting FastAPI"""

    # Creating a connection pool for/from Redis (max 20 connections, editable)
    logging.info("Creating Redis connection pool and client...")
    try:
        if REDIS_PASSWORD:
            redis_url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0"
        else:
            redis_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
        app.state.redis_pool = aredis.ConnectionPool.from_url(
            redis_url,
            max_connections=20,
            decode_responses=True,
            protocol=2
        )
        logging.info("Redis connection pool created!")

        # Creating Redis client
        redis_client = aredis.Redis(connection_pool=app.state.redis_pool)
        logging.info("Redis client created!")
    except Exception as e:
        logging.error(f"Failed to initialize Redis: {e}")

    # Redis listening to ticks (Background Task)
    async def redis_listener():
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("market_ticks", "market_candles")
        logging.info("Subscribed to Redis channels!")

        try:
            # Waiting for the messages sent by the ingestion or Celery
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = message["data"].decode("utf-8")
                        # Redis send the message to all clients of manager
                        await manager.broadcast(message=data)
                    except Exception as e:
                        logging.error(f"Failed to process message: {e}")
        except asyncio.CancelledError:
            logging.warning("Redis listener task cancelled, unsubsribing...")
            await pubsub.unsubscribe()
            await pubsub.close()
            raise
        except Exception as e:
            logging.error(f"Redis listener crashed: {e}")

    # Executing the background task
    listener_task = asyncio.create_task(redis_listener())

    # From here, FastAPI takes over completly until the server stops
    yield

    # Closing cleanly the server
    logging.info("Closing API server...")
    listener_task.cancel()
    await app.state.redis_pool.disconnect()

app = FastAPI(title="Stock Market Data API", lifespan=lifespan)

# FastAPI global exception handler for SQLAlchemy errors
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logging.error(f"SQLAlchemy error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error. Please try again later."},
    )

app.include_router(markets.router)
app.include_router(websockets.router)