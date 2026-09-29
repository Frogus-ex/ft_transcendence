import logging

import redis.asyncio as redis

from src.config import REDIS_HOST, REDIS_PASSWORD, REDIS_PORT
from src.domain.market import (
    DAY_MS,
    MONDAY_ALIGN_MS,
    OHLC_AGGREGATIONS,
    RETENTION_MS,
    TIMEFRAMES,
)

logger = logging.getLogger(__name__)

pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=REDIS_PORT,
    username="default",
    password=REDIS_PASSWORD or None,
    db=0,
    decode_responses=True,
    protocol=2,
)

r = redis.Redis(connection_pool=pool)
ts = r.ts()


async def init_timeseries(symbol: str):
    """Initializing Redis Time Series before listening to streaming pipeline."""
    ticks_key = f"ts:{symbol}:ticks"
    volume_ticks_key = f"ts:{symbol}:volume_ticks"

    try:
        await ts.create(
            key=ticks_key,
            retention_msecs=DAY_MS,
            duplicate_policy="last",
            labels={"symbol": symbol, "type": "ticks"},
        )
    except redis.ResponseError:
        pass

    try:
        await ts.create(
            key=volume_ticks_key,
            retention_msecs=DAY_MS,
            duplicate_policy="sum",
            labels={"symbol": symbol, "type": "volume_ticks"},
        )
    except redis.ResponseError:
        pass

    for tf_name, bucket_ms in TIMEFRAMES.items():
        align = MONDAY_ALIGN_MS if tf_name == "1w" else 0

        for field, agg in OHLC_AGGREGATIONS.items():
            dest_key = f"ts:{symbol}:ohlc:{tf_name}:{field}"
            try:
                await ts.create(
                    key=dest_key,
                    retention_msecs=RETENTION_MS[tf_name],
                    labels={"symbol": symbol, "timeframe": tf_name, "field": field},
                )
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
            except redis.ResponseError:
                pass

        volume_dest_key = f"ts:{symbol}:ohlc:{tf_name}:volume"
        try:
            await ts.create(
                key=volume_dest_key,
                retention_msecs=RETENTION_MS[tf_name],
                labels={"symbol": symbol, "timeframe": tf_name, "field": "volume"},
            )
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
        except redis.ResponseError:
            pass