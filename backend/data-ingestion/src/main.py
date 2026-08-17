from src import parse_raw_data, process_and_dispatch

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
	logging.info("Connecting to Binance websockets...")

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

if __name__ == "__main__":
	asyncio.run(run_ingestion())