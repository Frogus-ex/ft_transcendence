import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)

POSTGRES_USER = os.getenv("POSTGRES_INGEST_USER")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
password_file_path = os.getenv("POSTGRES_INGEST_PASSWORD_FILE")

if password_file_path and os.path.exists(password_file_path):
    try:
        with open(password_file_path, "r", encoding="utf-8") as p:
            POSTGRES_PASSWORD = p.read().strip()
    except OSError as exc:
        logger.warning(f"Unable to read Postgres password file {password_file_path}: {exc}")
        POSTGRES_PASSWORD = os.getenv("POSTGRES_INGEST_PASSWORD")
else:
    POSTGRES_PASSWORD = os.getenv("POSTGRES_INGEST_PASSWORD")

if not POSTGRES_USER or not POSTGRES_DB or not POSTGRES_PASSWORD:
    logger.warning(
        f"Postgres connection settings are incomplete: \
        user={bool(POSTGRES_USER)} \
        db={bool(POSTGRES_DB)} \
        password_loaded={bool(POSTGRES_PASSWORD)} \
        password_file={password_file_path}"
    )

DB_URL = (
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

engine = create_async_engine(
    DB_URL,
    echo=True,
    pool_size=10,
    max_overflow=20,
)

# //