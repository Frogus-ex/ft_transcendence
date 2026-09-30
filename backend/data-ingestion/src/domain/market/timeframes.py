TIMEFRAMES = {
    "1m": 60 * 1000,                # 60 000 ms
    "15m": 15 * 60 * 1000,          # 900 000 ms
    "1h": 60 * 60 * 1000,           # 3 600 000 ms
    "4h": 4 * 60 * 60 * 1000,       # 14 400 000 ms
    "1d": 24 * 60 * 60 * 1000,      # 86 400 000 ms
    "1w": 7 * 24 * 60 * 60 * 1000,  # 604 800 000 ms
}

OHLC_AGGREGATIONS = {
    "open": "first",
    "high": "max",
    "low": "min",
    "close": "last",
}

# Weekly bucket is based on epoch 01/01/1970 (Thursday)
# Alignment to 05/01/1970 (Monday) (in ms)
MONDAY_ALIGN_MS = 345_600_000

# Retention days before removing the old data
DAY_MS = 24 * 60 * 60 * 1000
RETENTION_MS = {
    "1m": 15 * DAY_MS,              # 15 days
    "15m": 30 * DAY_MS,             # 30 days
    "1h": 90 * DAY_MS,              # 90 days
    "4h": 365 * DAY_MS,             # 1 year
    "1d": 0,                        # Unlimited (negligible)
    "1w": 0,                        # Unlimited
}

__all__ = [
    "TIMEFRAMES",
    "OHLC_AGGREGATIONS",
    "MONDAY_ALIGN_MS",
    "DAY_MS",
    "RETENTION_MS",
]