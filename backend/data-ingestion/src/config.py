# This file gets environment for database and cache from .env and Docker secrets.

import os
import logging

logger = logging.getLogger(__name__)

# Postgres environment
POSTGRES_USER = os.getenv("POSTGRES_INGEST_USER")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
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

if not POSTGRES_USER or not POSTGRES_DB or not POSTGRES_PASSWORD:
    logger.warning(
        f"Postgres connection settings are incomplete: \
        user={bool(POSTGRES_USER)} \
        db={bool(POSTGRES_DB)} \
        password_loaded={bool(POSTGRES_PASSWORD)} \
        password_file={password_file_path_postgres}"
    )

# Database URL for SQLAlchemy
DB_URL = (
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
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