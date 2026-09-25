from services import listen_stream
from database import init_db_pool, close_db_pool
import asyncio
import logging
import signal

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

	loop = asyncio.get_running_loop()
	stop_event = asyncio.Event()

	def	shutdown_signal_handler():
		logging.info("Stop signal received (SIGINT/SIGTERM). Cleanly interrupting tasks...")
		stop_event.set()

	for sig in (signal.SIGTERM, signal.SIGINT):
		loop.add_signal_handler(sig, shutdown_signal_handler)

	logging.info("Requesting DB pool initialization (Celery task)...")
	# Initialize DB pool asynchronously via Celery worker
	init_db_pool.delay()

	logging.info("Connecting to Binance WebSockets...")

	try:
		# Looping through Binance WebSocket URLs
		async with asyncio.TaskGroup() as tg:
			tasks = [
				tg.create_task(listen_stream(stream["url"], stream["symbol"]))
				for stream in streams
			]

			async def	wait_for_shutdown():
				await stop_event.wait()
				for task in tasks:
					task.cancel()

			tg.create_task(wait_for_shutdown())

	except* Exception as e:
		logging.error(f"Fatal error in TaskGroup: {e}")
	finally:
		logging.info("Requesting DB pool close (Celery task)...")
		close_db_pool.delay()
		logging.info("DB pool closed!")

if __name__ == "__main__":
	try:
		asyncio.run(run_ingestion())
	except KeyboardInterrupt:
		pass