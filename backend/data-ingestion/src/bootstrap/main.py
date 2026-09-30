import asyncio
import logging
import signal

from src.bootstrap.postgres import close_db_pool, init_db_pool
from src.bootstrap.redis import init_timeseries
from src.domain.market import streams
from src.ingestion.websockets import listen_stream

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


async def run_ingestion():
    """Main function to run the data ingestion process."""
    for stream in streams:
        await init_timeseries(stream["symbol"])
    logging.info("All Redis Time Series series and compaction rules created!")

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def shutdown_signal_handler():
        logging.info("Stop signal received (SIGINT/SIGTERM). Cleanly interrupting tasks...")
        stop_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown_signal_handler)

    logging.info("Requesting DB pool initialization (Celery task)...")
    init_db_pool.delay()

    logging.info("Connecting to Binance WebSockets...")

    try:
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(listen_stream(stream["url"], stream["symbol"]))
                for stream in streams
            ]

            async def wait_for_shutdown():
                await stop_event.wait()
                for task in tasks:
                    task.cancel()

            tg.create_task(wait_for_shutdown())
    except* Exception as exc:
        logging.error(f"Fatal error in TaskGroup: {exc}")
    finally:
        logging.info("Requesting DB pool close (Celery task)...")
        close_db_pool.delay()
        logging.info("DB pool closed!")


if __name__ == "__main__":
    try:
        asyncio.run(run_ingestion())
    except KeyboardInterrupt:
        pass