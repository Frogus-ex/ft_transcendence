from services import listen_stream
from database import init_db_pool, close_db_pool
import asyncio
import logging

logging.basicConfig(
	level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Creating a list of dict of Binance WebSocket URLs
streams = [
	{"url": "wss://stream.binance.com:9443/ws/btcusdt@trade", "symbol": "BTCUSDT"},
	{"url": "wss://stream.binance.com:9443/ws/ethusdt@trade", "symbol": "ETHUSDT"},
	{"url": "wss://stream.binance.com:9443/ws/solusdt@trade", "symbol": "SOLUSDT"},
	{"url": "wss://stream.binance.com:9443/ws/xrpusdt@trade", "symbol": "XRPUSDT"},
	{"url": "wss://stream.binance.com:9443/ws/adausdt@trade", "symbol": "ADAUSDT"},
]

async def run_ingestion():
	"""Main function to run the data ingestion process.

	Note: DB init/cleanup and processing are handled as Celery tasks; this
	function only feeds messages into Celery workers.
	"""

	logging.info("Requesting DB pool initialization (Celery task)...")
	# Initialize DB pool asynchronously via Celery worker
	init_db_pool.delay()

	logging.info("Connecting to Binance WebSockets...")

	try:
		# Looping through Binance WebSocket URLs
		async with asyncio.TaskGroup() as tg:
			for stream in streams:
				tg.create_task(listen_stream(stream["url"], stream["symbol"]))
	except* ExceptionGroup as e:
		logging.error(f"Fatal error in TaskGroup: {e}")
	finally:
		logging.info("Requesting DB pool close (Celery task)...")
		close_db_pool.delay()

if __name__ == "__main__":
	asyncio.run(run_ingestion())