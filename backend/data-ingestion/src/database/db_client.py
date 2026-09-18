import logging
from config import (
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
    POSTGRES_PORT,
    POSTGRES_HOST,
)
from .models import Ticker
from .orm_db import SessionLocal
from tasks import app
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
        dsn = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
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

@app.task(name="save_to_db")
def save_to_db(cleaned_data: dict) -> None:
    """Saving the cleaned data to the database with SQLAlchemy (synchronous)."""

    try:
        with SessionLocal() as session:
            tick = Ticker(
                symbol=cleaned_data["symbol"],
                price=cleaned_data["price"],
                quantity=cleaned_data["quantity"],
                timestamp=cleaned_data["timestamp"],
            )
            session.add(tick)
            session.commit()
            logger.info(f"Saved to Postgres: {cleaned_data['symbol']} -> ${cleaned_data['price']}")
    except Exception as e:
        try:
            session.rollback()
        except Exception:
            pass
        logger.error(f"Error while saving with SQLAlchemy: {e}")