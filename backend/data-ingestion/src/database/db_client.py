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
    """Saving the cleaned data to the database"""

    global  pool
    if not pool:
        logger.warning("Postgres pool is not initialized, saving cancelled.")
        return

    # Normalize timestamp to a timezone-aware datetime (UTC)
    utc = ZoneInfo("UTC")
    ts = cleaned_data["timestamp"]

    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=utc)
        else:
            ts = ts.astimezone(utc)
    elif isinstance(ts, (int, float)):
        # assume milliseconds since epoch (UTC)
        ts = datetime.fromtimestamp(ts / 1000.0, tz=ZoneInfo("UTC")).astimezone(utc)
    elif isinstance(ts, str):
        try:
            parsed = datetime.fromisoformat(ts)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=utc)
            ts = parsed.astimezone(utc)
        except Exception:
            logger.warning("Timestamp string not ISO-parsable; using current time instead")
            ts = datetime.now(tz=utc)
    else:
        logger.warning(f"Unexpected timestamp type {type(ts)}; using current time instead")
        ts = datetime.now(tz=utc)

    ts = ts.replace(tzinfo=None)

    # Writing the query with $1, $2... to be safer and avoid SQL injection
    query = """
        INSERT INTO market_ticks (symbol, price, quantity, timestamp)
        VALUES ($1, $2, $3, $4);
    """

    try:
        # Execute the query with the correct values
        async with pool.acquire() as con:
            await con.execute(
                query,
                cleaned_data["symbol"],
                cleaned_data["price"],
                cleaned_data["quantity"],
                ts
            )
        logger.info(f"Saved to Postgres: {cleaned_data['symbol']} -> ${cleaned_data['price']}")
    except Exception as e:
        logger.error(f"Error while saving to Postgres: {e}")