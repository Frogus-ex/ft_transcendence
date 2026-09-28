import os
import logging
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

# Postgres environment
POSTGRES_USER = os.getenv("POSTGRES_INGEST_USER")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
password_file_path_postgres = os.getenv("POSTGRES_INGEST_PASSWORD_FILE")

if password_file_path_postgres and os.path.exists(password_file_path_postgres):
    try:
        with open(password_file_path_postgres, "r", encoding="utf-8") as p:
            POSTGRES_PASSWORD = p.read().strip()
    except OSError as exc:
        logger.warning(f"Unable to read Postgres password file {password_file_path_postgres}: {exc}")
        POSTGRES_PASSWORD = os.getenv("POSTGRES_INGEST_PASSWORD")
else:
    POSTGRES_PASSWORD = os.getenv("POSTGRES_INGEST_PASSWORD")

DB_PASSWORD_ESCAPED = quote_plus(POSTGRES_PASSWORD) if POSTGRES_PASSWORD else ""
if not POSTGRES_USER or not POSTGRES_DB or not DB_PASSWORD_ESCAPED:
    logger.warning(
        f"Postgres connection settings are incomplete (Data Ingestion): \
        user={bool(POSTGRES_USER)} \
        db={bool(POSTGRES_DB)} \
        password_loaded={bool(DB_PASSWORD_ESCAPED)} \
        password_file={password_file_path_postgres}"
    )

# Database URL for SQLAlchemy (synchronous driver using psycopg)
# URL-encode the password to avoid parsing issues when it contains special chars
DB_URL = (
    f"postgresql+psycopg://{POSTGRES_USER}:{DB_PASSWORD_ESCAPED}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# Redis environment
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT"))
password_file_path_redis = os.getenv("REDIS_PASSWORD_FILE")

if password_file_path_redis and os.path.exists(password_file_path_redis):
    try:
        with open(password_file_path_redis, "r", encoding="utf-8") as p:
            REDIS_PASSWORD = p.read().strip()
    except OSError as exc:
        logger.warning(f"Unable to read Redis password file {password_file_path_redis}: {exc}")
        REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
else:
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")


TIMEFRAMES = {
    "1m": 60 * 1000,                # 60 000 ms
    "15m": 15 * 60 * 1000,          # 900 000 ms
    "1h": 60 * 60 * 1000,           # 3 600 000 ms
    "4h": 4 * 60 * 60 * 1000,       # 14 400 000 ms
    "1d": 24 * 60 * 60 * 1000,      # 86 400 000 ms
    "1w": 7 * 24 * 60 * 60 * 1000,  # 604 800 000 ms
}

# Weekly bucket is based on epoch 01/01/1970 (Thursday)
# Alignment to 05/01/1970 (Monday) (in ms)
MONDAY_ALIGN_MS = 345_600_000

# Retention days before removing the old data
DAY_MS = 24 * 60 * 60 * 1000
RETENTION_MS = {
    "1m": 15 * DAY_MS,              # 15 days
    "15m": 30 * DAY_MS,             # 30 days
    "1h": 90 * DAY_MS,              # 90 days
    "4h": 365 * DAY_MS,             # 1 year
    "1d": 0,                        # Unlimited (negligible)
    "1w": 0,                        # Unlimited
}

OHLC_AGGREGATIONS = {
    "open": "first",
    "high": "max",
    "low": "min",
    "close": "last",
}

SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT"]