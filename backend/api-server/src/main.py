import asyncio
import logging
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from typing import List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
import redis.asyncio as aredis

from database import Ticker, MarketCandle, get_async_session
from schema import CandleValidation
from config import REDIS_PORT, REDIS_HOST, REDIS_PASSWORD

logging.basicConfig(
	level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

class ConnectionManager:
    # Creating an empty set (duplicates not allowed) for user's websocket connection
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def   connect(self, websocket: WebSocket):
        await websocket.connect()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # Wrapping the set into a list so it won't crash if exception is caught
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.active_connections.remove(connection)

manager = ConnectionManager

# Creating Redis pool
@asynccontextmanager
async def   lifespan(app: FastAPI):
    """Creating a connection pool for Redis before starting FastAPI"""

    if REDIS_PASSWORD:
        redis_url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0"
    else:
        redis_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

    # Creating a connection pool for/from Redis (max 20 connections, editable)
    logging.info("Creating Redis connection pool...")
    try:
        app.state.redis_pool = aredis.ConnectionPool.from_url(
            redis_url,
            max_connections=20,
            decode_responses=True,
            protocol=2
        )
        logging.info("Redis connection pool created!")
    except Exception as e:
        logging.error(f"Failed to create Redis connection pool: {e}")

    # Creating Redis client
    redis_client = aredis.Redis(connection_pool=app.state.redis_pool)

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

# For watchlist
@app.get("/api/markets")
async def   get_watchlist(session: AsyncSession = Depends(get_async_session)):
    """Gets the latest price of the currency and compare it to the price from 24-hrs ago"""

    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)

    symbols_query = select(Ticker.symbol).distinct()
    symbols_res = await session.execute(symbols_query)
    symbols = symbols_res.scalars().all()

    watchlist = []

    for symbol in symbols:
        # Getting the latest price of each currency
        latest_query = (
            select(Ticker.price)
            .where(Ticker.symbol == symbol)
            .order_by(Ticker.timestamp.desc())
            .limit(1)
        )
        latest_price = (await session.execute(latest_query)).scalar()

        # Getting the oldest price (24-hrs ago) of each currency
        old_query = (
            select(Ticker.price)
            .where(Ticker.symbol == symbol, Ticker.timestamp <= day_ago)
            .order_by(Ticker.timestamp.desc())
            .limit(1)
        )
        old_price = (await session.execute(old_query)).scalar()

        # Calculating price variation in percentage
        if latest_price and old_price and old_price > 0:
            change_24h = ((latest_price - old_price) / old_price) * 100
        else:
            change_24h = 0.0

        watchlist.append({
            "symbol": symbol,
            "lastPrice": latest_price,
            "change24h": change_24h
        })

    return watchlist

# HTTP Ticker, main graph (Database)
@app.get("/api/markets/{symbol}/candles", response_model=List[CandleValidation])
async def   get_candles(
    symbol: str,
    interval: str = "1m",
    limit: int = 100,
    session: AsyncSession = Depends(get_async_session)
):
    """Collect the last x ticks (default 100) from the table "market_candles" with a given interval (default 1-min)"""

    query = (
        select(MarketCandle)
        .where(MarketCandle.symbol == symbol.upper(),
               MarketCandle.interval == interval
        )
        .order_by(MarketCandle.time.desc())
        .limit(limit)
    )

    # Getting tuple with result -> unpack it with .scalars() -> putting them in a list with .all()
    result = await session.execute(query)
    candles = result.scalars().all()
    # Returning all the tables but backwards (from the oldest to the latest)
    return candles[::-1]

# WebSocket (Cache)
@app.websocket("/ws/markets/{symbol}")
async def   ws_market_data(websocket: WebSocket):
    """Opening a websocket pipeline and pushing ticks from Redis (every s/ms)"""

    logging.info("Opening websocket pipeline...")
    await websocket.accept()
    logging.info("Websocket pipeline is now opened!")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logging.warning("Client disconnected. Removing the client...")
        manager.disconnect(websocket)
    except Exception as e:
        logging.error(f"Error: {e}")
        manager.disconnect(websocket)