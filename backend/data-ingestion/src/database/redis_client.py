import redis.asyncio as redis
import logging
from config import (
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
    TIMEFRAMES,
    MONDAY_ALIGN_MS,
    RETENTION_MS,
    OHLC_AGGREGATIONS,
    DAY_MS,
)


logger = logging.getLogger(__name__)

# Initializing Redis client
pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=REDIS_PORT,
    username="default",
    password=REDIS_PASSWORD or None,
    db=0,
    decode_responses=True,
    protocol=2
)

r = redis.Redis(connection_pool=pool)

ts = r.ts()


async def	init_timeseries(symbol: str):
    """Initializing Redis Time Series before listening to streaming pipeline"""

    ticks_key = f"ts:{symbol}:ticks"
    volume_ticks_key = f"ts:{symbol}:volume_ticks"

    # 24hrs raw ticks conservation
    try:
        await ts.create(
            key=ticks_key,
            retention_msecs=DAY_MS, # 24hrs in milliseconds
            duplicate_policy="last", # If same timestamp, save the last
            labels={"symbol": symbol, "type": "ticks"},
        )
        logger.debug(f"Redis Time Series '{ticks_key}' series created!")
    except redis.ResponseError:
        pass # Key already exists, ignoring

    # Same as above but for volume
    try:
        await ts.create(
            key=volume_ticks_key,
            retention_msecs=DAY_MS,
            duplicate_policy="sum", # Adding up instead of overwriting
            labels={"symbol": symbol, "type": "volume_ticks"},
        )
        logger.debug(f"Redis Time Series '{volume_ticks_key}' series created!")
    except redis.ResponseError:
        pass

    # OHLC aggregations for each timeframe
    for tf_name, bucket_ms in TIMEFRAMES.items():
        align = MONDAY_ALIGN_MS if tf_name == "1w" else 0

        for field, agg in OHLC_AGGREGATIONS.items():
            dest_key = f"ts:{symbol}:ohlc:{tf_name}:{field}"

            try:
                await ts.create(
                    key=dest_key,
                    retention_msecs=RETENTION_MS[tf_name],
                    labels={"symbol": symbol, "timeframe": tf_name, "field": field}
                )
                logger.debug(f"Redis Time Series '{dest_key}' series created!")
            except redis.ResponseError:
                pass

            try:
                await ts.createrule(
                    source_key=ticks_key,
                    dest_key=dest_key,
                    aggregation_type=agg,
                    bucket_size_msec=bucket_ms,
                    align_timestamp=align,
                )
                logger.debug(f"Redis Time Series '{ticks_key}' compaction rule created!")
            except redis.ResponseError:
                pass

        # Same thing for volume
        volume_dest_key = f"ts:{symbol}:ohlc:{tf_name}:volume"
        try:
            await ts.create(
                key=volume_dest_key,
                retention_msecs=RETENTION_MS[tf_name],
                labels={"symbol": symbol, "timeframe": tf_name, "field": "volume"},
            )
            logger.debug(f"Redis Time Series '{volume_dest_key}' series created!")
        except redis.ResponseError:
            pass

        try:
            await ts.createrule(
                source_key=volume_ticks_key,
                dest_key=volume_dest_key,
                aggregation_type="sum",
                bucket_size_msec=bucket_ms,
                align_timestamp=align,
            )
            logger.debug(f"Redis Time Series '{volume_ticks_key}' compaction rule created!")
        except redis.ResponseError:
            pass