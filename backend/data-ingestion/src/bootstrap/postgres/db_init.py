import logging

from psycopg_pool import ConnectionPool

from src.bootstrap.celery import app
from src.config import (
    DB_PASSWORD_ESCAPED,
    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_USER,
)

logger = logging.getLogger(__name__)

pool: ConnectionPool | None = None


@app.task(name="init_db_pool")
def init_db_pool():
    """Initializing a psycopg connection pool to Postgres."""
    global pool
    try:
        dsn = f"postgresql://{POSTGRES_USER}:{DB_PASSWORD_ESCAPED}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
        pool = ConnectionPool(conninfo=dsn, min_size=1, max_size=10)
        logger.info("Postgres psycopg pool successfully initialized!")
    except Exception as exc:
        logger.error(f"Failed to initialize psycopg pool: {exc}")


@app.task(name="close_db_pool")
def close_db_pool():
    """Cleanly closing the psycopg connection pool to Postgres."""
    global pool
    if pool:
        try:
            pool.close()
            logger.info("Postgres pool closed.")
        except Exception as exc:
            logger.error(f"Error closing pool: {exc}")