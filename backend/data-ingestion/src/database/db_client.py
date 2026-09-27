import logging
from tasks import app
from config import (
    POSTGRES_USER,
    DB_PASSWORD_ESCAPED,
    POSTGRES_DB,
    POSTGRES_PORT,
    POSTGRES_HOST,
)
from psycopg_pool import ConnectionPool

logger = logging.getLogger(__name__)

# Creating pool global variable to store the connection pool
pool: ConnectionPool | None = None


@app.task(name="init_db_pool")
def init_db_pool():
    """Initializing a psycopg connection pool to Postgres (optional).

    SQLAlchemy sessions use the engine's pool; this pool is available
    for raw SQL or other direct psycopg usages.
    """
    global pool
    try:
        dsn = f"postgresql://{POSTGRES_USER}:{DB_PASSWORD_ESCAPED}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
        pool = ConnectionPool(conninfo=dsn, min_size=1, max_size=10)
        logger.info("Postgres psycopg pool successfully initialized!")
    except Exception as e:
        logger.error(f"Failed to initialize psycopg pool: {e}")


@app.task(name="close_db_pool")
def close_db_pool():
    """Cleanly closing the psycopg connection pool to Postgres"""
    global pool
    if pool:
        try:
            pool.close()
            logger.info("Postgres pool closed.")
        except Exception as e:
            logger.error(f"Error closing pool: {e}")