from .parser import parse_raw_data
from .dispatcher import process_and_dispatch
from websockets.exceptions import ConnectionClosed
import asyncio
import websockets
import logging

logger = logging.getLogger(__name__)

async def   listen_stream(url: str, symbol: str) -> str:
    while True:
        try:
            async with websockets.connect(
                url,
                ping_interval = 20,
                ping_timeout = 10
                ) as websocket:
                    logger.info(f"Connected to Binance {symbol} WebSocket!")

                    while True:
                        raw_data = await websocket.recv()
                        cleaned_data = parse_raw_data(raw_data)

                        if cleaned_data:
                            # Push processing to Celery worker
                            process_and_dispatch.delay(cleaned_data)
        except asyncio.CancelledError:
             logging.info(f"Closing {symbol} WebSocket...")
             raise

        except ConnectionClosed:
            logging.warning(f"Connection closed with {symbol}. Reconnecting in 2s...")
            await asyncio.sleep(2)

        except Exception as e:
            logging.error(f"Error with {symbol}: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)