from celery import Celery
from config import (
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
)
from urllib.parse import quote_plus

if REDIS_PASSWORD:
    enc = quote_plus(REDIS_PASSWORD)
    broker_url = f"redis://:{enc}@{REDIS_HOST}:{REDIS_PORT}/0"
    backend_url = f"redis://:{enc}@{REDIS_HOST}:{REDIS_PORT}/1"
else:
    broker_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    backend_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/1"

# Add files using @app decorator to include it in Celery worker
app = Celery('trading_tasks',
             broker=broker_url,
             backend=backend_url,
             include=['calculations.operations',
                      'database.db_client',
                      'database.redis_client',
                      'services.dispatcher'])

app.conf.update(
    task_serializer='json',
    accept_content=['json'],  # Ignore other content
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)