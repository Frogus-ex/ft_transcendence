from celery import Celery
from config import (
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
)

if REDIS_PASSWORD:
    broker_url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/0"
    backend_url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/1"
else:
    broker_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    backend_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/1"

app = Celery('trading_tasks', broker=broker_url, backend=backend_url)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],  # Ignore other content
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

"""
--- For data scientist ---

1- Read DOC.md
2- Use either Redis cache or Postgres database values (depends on what scale you want to calculate,
    see DOC.md how to use/access the services) to calculate the prices.
3- Store the calculated data into "market_indicators" via SQLAlchemy (take db_client.py as example and see in models.py for reference)

"""

# Mandatory: use the decorator @app.task to use Celery, otherwise very slow and the execution will be blocked
@app.task
def function_to_calculate():
    """Write your function to calculate prices"""
    pass