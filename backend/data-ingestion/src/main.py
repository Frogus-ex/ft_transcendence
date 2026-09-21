from services import parse_raw_data
from services import process_and_dispatch
from database import init_db_pool, close_db_pool
from websockets.exceptions import ConnectionClosed
import asyncio
import websockets
import logging

logging.basicConfig(
	level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade"

async def run_ingestion():
	"""Main function to run the data ingestion process.

	Note: DB init/cleanup and processing are handled as Celery tasks; this
	function only feeds messages into Celery workers.
	"""

	logging.info("Requesting DB pool initialization (Celery task)...")
	# Initialize DB pool asynchronously via Celery worker
	init_db_pool.delay()

	logging.info("Connecting to Binance websockets...")

	try:
		while True:
			try:
				# Connecting to Binance websockets, adding ping so Binance server doesn't close automatically
				async with websockets.connect(
					BINANCE_WS_URL,
					ping_interval = 20, # Send ping every 20s
					ping_timeout = 10 # Timeout after 10s
					) as websocket:
						logging.info("Connected to Binance websocket!")

						while True:
							raw_data = await websocket.recv()
							cleaned_data = parse_raw_data(raw_data)
							if cleaned_data:
								# Push processing to Celery worker
								process_and_dispatch.delay(cleaned_data)

			except ConnectionClosed:
				logging.warning("Connection closed. Reconnecting in 2s...")
				await asyncio.sleep(2)

			except Exception as e:
				logging.error(f"Error: {e}. Reconnecting in 5s...")
				await asyncio.sleep(5)
	finally:
		logging.info("Requesting DB pool close (Celery task)...")
		close_db_pool.delay()

if __name__ == "__main__":
	asyncio.run(run_ingestion())