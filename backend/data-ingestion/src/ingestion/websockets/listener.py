import asyncio
import logging

import websockets
from websockets.exceptions import ConnectionClosed

from src.ingestion.pipelines import parse_raw_data
from src.ingestion.tasks import process_and_dispatch

logger = logging.getLogger(__name__)


async def listen_stream(url: str, symbol: str) -> str:
    while True:
        try:
            async with websockets.connect(
                url,
                ping_interval=20,
                ping_timeout=10,
            ) as websocket:
                logger.info(f"Connected to Binance {symbol} WebSocket!")

                while True:
                    raw_data = await websocket.recv()
                    cleaned_data = parse_raw_data(raw_data)

                    if cleaned_data:
                        process_and_dispatch.delay(cleaned_data)
        except asyncio.CancelledError:
            logging.info(f"Closing {symbol} WebSocket...")
            raise
        except ConnectionClosed:
            logging.warning(f"Connection closed with {symbol}. Reconnecting in 2s...")
            await asyncio.sleep(2)
        except Exception as exc:
            logging.error(f"Error with {symbol}: {exc}. Reconnecting in 5s...")
            await asyncio.sleep(5)