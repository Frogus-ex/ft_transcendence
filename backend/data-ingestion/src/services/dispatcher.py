import logging
from tasks import app
from database import save_to_cache_and_publish


logger = logging.getLogger(__name__)


@app.task(name="process_and_dispatch")
def process_and_dispatch(cleaned_data: dict):
    """Process the cleaned data and dispatch it to Redis.

    This function is a Celery task so it can be executed by workers.
    It delegates cache publishing and DB writes to separate Celery tasks.
    """

    # Save the latest price in cache (run as a separate task)
    try:
        save_to_cache_and_publish.delay(cleaned_data)
    except Exception as e:
        logger.error(f"Failed to queue Redis publish task: {e}")