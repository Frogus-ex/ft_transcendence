import logging

from src.bootstrap.celery import app
from src.storage.redis import save_to_cache_and_publish

logger = logging.getLogger(__name__)


@app.task(name="process_and_dispatch")
def process_and_dispatch(cleaned_data: dict):
    """Process the cleaned data and dispatch it to Redis."""
    try:
        save_to_cache_and_publish.delay(cleaned_data)
    except Exception as exc:
        logger.error(f"Failed to queue Redis publish task: {exc}")