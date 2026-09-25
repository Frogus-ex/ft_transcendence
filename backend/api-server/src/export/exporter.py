import asyncio
import logging
from fastapi import APIRouter
from fastapi.responses import Response, StreamingResponse
import xml.etree.ElementTree as et
from routers.markets import get_candles

router = APIRouter(prefix="/export", tags=["Export"])

router.get("")
async def   export_market_data(
    symbol: str,
    format: str,
    interval: str = "1m",
    limit: int = 100):
    """Export the data in format file from symbol"""

    data = await get_candles(symbol, interval, limit)

    fmt = format.lower()
    ...