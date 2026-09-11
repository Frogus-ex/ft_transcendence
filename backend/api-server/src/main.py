import asyncio
import logging
from decimal import Decimal
from contextlib import asynccontextmanager
from typing import List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aredis

from database import Ticker, MarketIndicator, get_async_session
from schema import TickerValidation, IndicatorValidation
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
        # Wrapping the set into a list so it won't crash if exception if caught
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

    redis_url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0" if REDIS_PASSWORD else f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

    # Creating a connection pool for/from Redis (max 20 connections, editable)
    app.state.redis_pool = aredis.ConnectionPool.from_url(
        redis_url,
        max_connections=20,
        decode_responses=True,
        protocol=2
    )

    # Creating Redis client
    redis_client = aredis.Redis(connection_pool=app.state.redis_pool)

    # Redis listening to ticks (Background Task)
    async def redis_listener():
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("market_ticks", "market_indicators")

        try:
            # Waiting for the messages sent by the ingestion or Celery
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"].decode("utf-8")
                    # Redis send the message to all clients of manager
                    manager.broadcast(message=data)
        except asyncio.CancelledError:
            await pubsub.unsubscribe()

    # Executing the background task
    listener_task = asyncio.create_task(redis_listener())

    # From here, FastAPI takes over completly until the server stops
    yield

    # Closing cleanly the server
    listener_task.cancel()
    await app.state.redis_pool.disconnect()

app = FastAPI(title="Market Data API", lifespan=lifespan)

# For watchlist
@app.get("/api/markets")
async def   get_watchlist(
    symbol: str,
    last_price: Decimal,
    last_day_change: Decimal,
    session: AsyncSession = Depends(get_async_session)
):
    """Gets the latest price of the currency and compare it to the latest price from 24-hrs ago"""
    pass

# HTTP Ticker, main graph (Database)
@app.get("/api/markets/{symbol}/candles", response_model=List[TickerValidation])
async def   get_historical_ticks(
    symbol: str,
    limit: int = 100,
    session: AsyncSession = Depends(get_async_session)
):
    """Collect the last x ticks (default 100) from the table "market_ticks"."""

    query = (
        select(Ticker)
        .where(Ticker.symbol == symbol.upper())
        .order_by(Ticker.timestamp.desc())
        .limit(limit)
    )

    # Getting tuple with result -> unpack it with .scalars() -> putting them in a list with .all()
    result = await session.execute(query)
    ticks = result.scalars().all()
    return ticks

# HTTP Indicators, sub-graph (Database)
@app.get("/api/indicators/{symbol}", response_model=List[IndicatorValidation])
async def   get_historical_indicators(
    symbol: str,
    indicator_name: str = "RSI_14",
    limit: int = 100,
    session: AsyncSession = Depends(get_async_session)
):
    """Collect the last x indicators (default 100) from the table "market_indicators"."""

    query = (
        select(MarketIndicator)
        .where(MarketIndicator.symbol == symbol.upper(),
               MarketIndicator.indicator_name == indicator_name.upper()
        )
        .order_by(MarketIndicator.timestamp.desc())
        .limit(limit)
    )
    result = await session.execute(query)
    indicators = result.scalars().all()
    return indicators

# WebSocket (Cache)
@app.websoclets("/ws/markets/{symbol}")
async def   ws_market_data(websocket: WebSocket):
    """Opening a websocket pipeline and pushing ticks from Redis (every s/ms)"""

    await websocket.accept()

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
