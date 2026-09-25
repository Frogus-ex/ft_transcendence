from database.redis_client import save_to_cache_and_publish
from database.db_client import save_to_db
from tasks import app

import time
import logging

logger = logging.getLogger(__name__)

LAST_DB_SAVE = 0
SAVE_INTERVAL_SECOND = 1.0
LAST_SAVED_PRICE = None


@app.task(name="process_and_dispatch")
def process_and_dispatch(cleaned_data: dict):
    """Process the cleaned data and dispatch it to Redis and Postgres.

    This function is a Celery task so it can be executed by workers.
    It delegates cache publishing and DB writes to separate Celery tasks.
    """

    global LAST_DB_SAVE, LAST_SAVED_PRICE

    current_time = time.time()

    # Save the latest price in cache (run as a separate task)
    try:
        save_to_cache_and_publish.delay(cleaned_data)
        logger.info(f"Pushed to Redis: {cleaned_data['symbol']} -> ${cleaned_data['price']}")
    except Exception as e:
        logger.error(f"Failed to queue Redis publish task: {e}")

    # Only save price to DB if time interval passed and price changed
    time_passed = (current_time - LAST_DB_SAVE) >= SAVE_INTERVAL_SECOND
    price_changed = cleaned_data['price'] != LAST_SAVED_PRICE

    if time_passed and price_changed:
        try:
            save_to_db.delay(cleaned_data)
            LAST_DB_SAVE = current_time
            LAST_SAVED_PRICE = cleaned_data['price']
        except Exception as e:
            logger.error(f"Failed to queue DB save task: {e}")
