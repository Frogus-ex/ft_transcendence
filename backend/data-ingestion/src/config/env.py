import logging
import os
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

# Postgres environment
POSTGRES_USER = os.getenv("POSTGRES_INGEST_USER") or "postgres"
POSTGRES_DB = os.getenv("POSTGRES_DB") or "transcendence_db"
POSTGRES_HOST = os.getenv("POSTGRES_HOST") or "localhost"
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
        "Postgres connection settings are incomplete (Data Ingestion): "
        f"user={bool(POSTGRES_USER)} "
        f"db={bool(POSTGRES_DB)} "
        f"password_loaded={bool(DB_PASSWORD_ESCAPED)} "
        f"password_file={password_file_path_postgres}"
    )

DB_URL = (
    f"postgresql+psycopg://{POSTGRES_USER}:{DB_PASSWORD_ESCAPED}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# Redis environment
REDIS_HOST = os.getenv("REDIS_HOST") or "localhost"
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
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
