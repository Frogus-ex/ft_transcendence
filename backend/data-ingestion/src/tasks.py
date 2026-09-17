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
3- Store the calculated data into "market_candles" (open, close...) via SQLAlchemy (take db_client.py as example and see in models.py for reference)

"""

# Mandatory: use the decorator @app.task to use Celery, otherwise very slow and the execution will be blocked
@app.task
def function_to_calculate():
    """Write your function to calculate prices"""
    pass


# # Ensure modules that declare tasks are imported so decorators run and tasks register.
# # Try both top-level and `src.`-prefixed imports to handle different PYTHONPATH/entrypoints.
# import logging
# _logger = logging.getLogger(__name__)

# def _try_import(mod_name: str) -> bool:
#     try:
#         __import__(mod_name)
#         return True
#     except Exception as e:
#         _logger.debug("Import %s failed: %s", mod_name, e)
#         return False

# for base in ("", "src."):
#     ok1 = _try_import(f"{base}services.dispatcher")
#     ok2 = _try_import(f"{base}database.db_client")
#     ok3 = _try_import(f"{base}database.redis_client")
#     if ok1 or ok2 or ok3:
#         _logger.info("Imported task modules using prefix '%s'", base)
#         break
# else:
#     _logger.warning("Failed to import any known task modules; tasks may not be registered")