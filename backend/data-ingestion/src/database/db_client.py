import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from config import (
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
    POSTGRES_PORT,
    POSTGRES_HOST,
)
from .models import Ticker
from .orm_db import AsyncSessionLocal
import asyncpg

logger = logging.getLogger(__name__)

# Creating pool global variable to store the connection pool
pool : asyncpg.Pool | None = None

async def   init_db_pool():
    """Initializing connection pool to Postgres"""

    global  pool
    try:
        pool = await asyncpg.create_pool(
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            database=POSTGRES_DB,
            port=POSTGRES_PORT,
            host=POSTGRES_HOST,
            min_size=1,
            max_size=10
        )
        logger.info("Postgres connection pool successfully initialized!")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")

async def   close_db_pool():
    """Cleanly closing the connection pool to Postgres"""

    global  pool
    if pool:
        await pool.close()
        logger.info("Postgres pool closed.")

async def   save_to_db(cleaned_data: dict) -> None:
    """Saving the cleaned data to the database with SQLAlchemy"""

    global  pool
    if not pool:
        logger.warning("Postgres pool is not initialized, saving cancelled.")
        return

    async with AsyncSessionLocal() as session:
        try:
            tick = Ticker(
                symbol=cleaned_data["symbol"],
                price=cleaned_data["price"],
                quantity=cleaned_data["quantity"],
                timestamp=cleaned_data["timestamp"],
            )
            session.add(tick)
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Error while saving with SQLAlchemy: {e}")