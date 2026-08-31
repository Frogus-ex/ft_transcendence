from services.parser import parse_raw_data
from services.dispatcher import process_and_dispatch
from database.db_client import init_db_pool, close_db_pool

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
	"""Main function to run the data ingestion process"""

	logging.info("Connecting to Binance websockets...")

	logging.info("Creating a connection pool to the databse...")
	await init_db_pool()

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

							if (cleaned_data):
								await process_and_dispatch(cleaned_data)

			except ConnectionClosed:
				logging.warning(f"Connection closed. Reconnecting in 2s...")
				await asyncio.sleep(2)

			except Exception as e:
				logging.error(f"Error: {e}. Reconnecting in 5s...")
				await asyncio.sleep(5)
	finally:
		logging.info("Closing the connection pool to the databse...")
		await close_db_pool()

if __name__ == "__main__":
	asyncio.run(run_ingestion())