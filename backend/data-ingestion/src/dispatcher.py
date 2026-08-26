from redis_client import save_to_cache
from db_client import save_to_db

import time
import logging

logger = logging.getLogger(__name__)

LAST_DB_SAVE = 0
SAVE_INTERVAL_SECOND = 1.0
LAST_SAVED_PRICE = None

async def process_and_dispatch(cleaned_data: dict):
    """Process the cleaned data and dispatch it to Redis and Postgres"""

    global  LAST_DB_SAVE, LAST_SAVED_PRICE

    current_time = time.time()

    # Save the latest price in cache
    save_to_cache(cleaned_data)
    logger.info(f"Pushed to Redis: {cleaned_data['symbol']} -> ${cleaned_data['price']}")

    # Sorting prices for DB. Only save price to DB if time interval between each price is >= SAVE_INTERVAL_SECOND
    # And if the prices aren't the same (duplicates)
    time_passed = (current_time - LAST_DB_SAVE) >= SAVE_INTERVAL_SECOND
    price_changed = cleaned_data['price'] != LAST_SAVED_PRICE

    if time_passed and price_changed:
        # Save the price to the DB
        await save_to_db(cleaned_data)

        # Updating the global variables
        LAST_DB_SAVE = current_time
        LAST_SAVED_PRICE = cleaned_data['price']
