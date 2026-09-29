import logging
from urllib.parse import quote_plus

from celery import Celery
from celery.signals import after_setup_logger

from src.config import REDIS_HOST, REDIS_PASSWORD, REDIS_PORT

if REDIS_PASSWORD:
    enc = quote_plus(REDIS_PASSWORD)
    broker_url = f"redis://:{enc}@{REDIS_HOST}:{REDIS_PORT}/0"
    backend_url = f"redis://:{enc}@{REDIS_HOST}:{REDIS_PORT}/1"
else:
    broker_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    backend_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/1"

app = Celery(
    "trading_tasks",
    broker=broker_url,
    backend=backend_url,
    include=[
        "src.bootstrap.postgres.db_init",
        "src.bootstrap.redis.redis_async_init",
        "src.storage.redis.tick_store",
        "src.storage.redis.candle_store",
        "src.ingestion.tasks.dispatcher",
    ],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

app.conf.beat_schedule = {
    "persist-closed-candles": {
        "task": "persist_all_closed_candles",
        "schedule": 60.0,
    }
}

app.conf.broker_connection_retry_on_startup = False
app.conf.task_publish_retry = False


class IgnoreTaskSuccessfull(logging.Filter):
    """Ignore Celery successful tasks."""

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        if "succeeded in " in message and "Task" in message:
            return False
        if "received" in message and "Task" in message:
            return False
        return True


@after_setup_logger.connect
def setup_celery_logging(logger, **kwargs):
    for handler in logger.handlers:
        handler.addFilter(IgnoreTaskSuccessfull())