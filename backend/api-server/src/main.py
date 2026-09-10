import asyncio
import json
import logging
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aredis

from database import Ticker, MarketIndicator, get_async_session
from schema import TickerValidation, IndicatorValidation

logging.basicConfig(
	level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

app = FastAPI(title="Market Data API")

@app.get("/api/ticks/{symbol}", response_model=List[TickerValidation])
async def   get_historical_ticks(
    symbol: str,
    limit: int = 100,
    session: AsyncSession = Depends(get_async_session)
):
    """Collect the last x ticks (default 100) from the database"""
    query = (
        select(Ticker)
        .where(Ticker.symbol == symbol.upper())
        .order_by(Ticker.timestamp.desc())
        .limit(limit)
    )
    result = await session.execute(query)
    ticks = result.scarlars().all()
    return ticks


@app.get("/")
def root():
    return {"hello": "world"}