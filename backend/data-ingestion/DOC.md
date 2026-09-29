# Data Ingestion Backend

The ingestion backend follows an EtLT pipeline (Extract, Transform-Light, Load, Transform-Heavy). It connects to the Binance WebSocket, extracts live market events, performs a lightweight validation and normalization step, stores the cleaned data in Redis and PostgreSQL, and then performs heavier transformations later to generate derived market data for the frontend.

## Why?

This architecture was chosen to balance speed, data quality, and storage efficiency for a real-time financial data stream.

For streaming products such as stock and crypto market data, the volume is high and the latency requirement is strict. A full ETL pipeline can become a bottleneck because each message is processed and transformed before it reaches storage, which slows the ingestion path and increases processing overhead under heavy load. In contrast, ELT is excellent for raw, high-volume ingestion because it keeps most data in storage and defers transformation. However, for this project, I do not want to store every unfiltered message as-is because the API stream contains noisy, redundant, or malformed payloads that are not useful for downstream analytics or frontend display.

The EtLT approach gives the best trade-off:

- Extract: fetch live trade data from the Binance API.
- Transform-Light: clean, validate, and normalize only the fields that matter (`symbol`, `price`, `quantity`, `timestamp`).
- Load: persist the lightweight cleaned data into Redis and PostgreSQL for fast access and persistence.
- Transform-Heavy: compute aggregates such as OHLC candles directly in Redis Time Series, which performs the time-bucketing and aggregation natively for analytics and visualization.

### Pipeline comparison

| Specification | ETL | ELT | EtLT |
| --- | --- | --- | --- |
| Fast ingestion | ❌ Slow when handling large real-time streams | ✅ Very fast raw ingestion | ✅ Fast, because only light validation happens in real time |
| Scalable for streaming data | ❌ Harder to scale under constant high-frequency input | ✅ Good for large-scale raw ingestion | ✅ Good balance for live streams with later aggregation |
| Data quality before storage | ✅ Strong validation before writing | ⚠️ Often stores raw/unfiltered data first | ✅ Good validation and filtering before persistence |
| Storage efficiency | ✅ Efficient, but only after heavy transformation | ❌ Can require more storage for raw data | ✅ More efficient than ELT because only useful fields are stored |
| Flexibility for later analysis | ⚠️ Lower flexibility because transformation happens early | ✅ Very flexible for downstream analysis | ✅ Flexible, while still keeping ingestion efficient |
| Compute cost during ingestion | ❌ High CPU cost per message | ✅ Lower cost at ingestion, higher cost later | ✅ Lower real-time cost, while heavy processing is deferred |
| Good for real-time dashboards | ❌ Weak latency for high-frequency updates | ✅ Good for streaming ingestion | ✅ Best fit for real-time dashboards with derived summaries |
| Complexity | ⚠️ Simpler conceptual flow | ⚠️ Simpler ingestion, but more downstream complexity | ⚠️ Slightly more complex, but manageable and structured |
| Fit for this project | ❌ Not ideal for live market ingestion | ⚠️ Possible, but less efficient for data quality goals | ✅ Best fit for this project |

### Why EtLT is the most suitable choice here

- ✅ Real-time market data requires low-latency ingestion.
- ✅ Light validation prevents corrupted or incomplete data from polluting storage.
- ✅ Storing only useful fields reduces database size and unnecessary writes.
- ✅ Heavy calculations are deferred to dedicated processing tasks, which keeps the streaming layer efficient.
- ✅ The frontend receives cleaner, derived market data instead of raw tick noise.
- ✅ This design is easier to scale when more market pairs, indicators, or aggregation windows are added later.

### When each pipeline is preferred

- ETL is preferred when the data is already structured and needs governance before storage.
- ELT is preferred when raw ingestion speed is the priority and data is transformed later in the warehouse.
- EtLT is preferred when data must be validated and reduced in real time, but derived analytics can still be computed later.

## Project Structure

```text
src/
├── bootstrap/
│   ├── __init__.py
│   ├── main.py
│   ├── celery/
│   │   ├── __init__.py
│   │   └── tasks.py
│   ├── postgres/
│   │   ├── __init__.py
│   │   └── db_init.py
│   └── redis/
│       ├── __init__.py
│       ├── redis_async_init.py
│       └── redis_sync_init.py
├── config/
│   ├── __init__.py
│   └── env.py
├── domain/
│   └── market/
│       ├── __init__.py
│       ├── models.py
│       ├── symbols.py
│       └── timeframes.py
├── ingestion/
│   ├── __init__.py
│   ├── pipelines/
│   │   ├── __init__.py
│   │   └── parser.py
│   ├── tasks/
│   │   ├── __init__.py
│   │   └── dispatcher.py
│   └── websockets/
│       ├── __init__.py
│       └── listener.py
└── storage/
    ├── __init__.py
    ├── postgres/
    │   ├── __init__.py
    │   └── orm_db.py
    └── redis/
        ├── __init__.py
        ├── tick_store.py
        └── candle_store.py
```

## Data Flow

The ingestion architecture is built around a simple, scalable pipeline:

1. The application starts one Binance WebSocket listener per symbol using an `asyncio.TaskGroup` in `bootstrap/main.py`.
2. Each listener connects to its stream, receives trade events in real time, and reconnects automatically if the socket drops.
3. The raw payload is normalized in `ingestion/pipelines/parser.py` to retain only the fields required by the platform.
4. The cleaned data is queued through Celery tasks and dispatched to Redis for low-latency access and publication.
5. Redis Time Series stores the live tick stream and the interval-based aggregate series, while the frontend reads the latest value and the derived candle buckets.
6. Closed candle windows are periodically flushed into PostgreSQL for longer-term storage and historical queries.

This keeps the real-time ingestion path fast while moving heavy aggregation to the storage layer where Redis Time Series can do the bucketing natively.

## Project Architecture

The refactored project is organized by responsibility, with clear separation between startup, ingestion, and storage concerns:

- `bootstrap/main.py` initializes the Redis Time Series backing store and starts one listener per configured symbol.
- `ingestion/websockets/listener.py` maintains each Binance WebSocket connection and keeps the stream alive with reconnect logic.
- `ingestion/pipelines/parser.py` converts the raw Binance event into a compact, validated payload.
- `ingestion/tasks/dispatcher.py` queues the cleaned data for async processing.
- `storage/redis/tick_store.py` writes the latest cache entry, stores tick and volume points in Redis Time Series, and publishes live updates to the market channel.
- `storage/redis/candle_store.py` computes the latest closed OHLC buckets and persists them to PostgreSQL.
- `bootstrap/celery/tasks.py` configures the Celery app, beat schedule, and task registration for the ingestion pipeline.
- `storage/postgres/orm_db.py` defines the SQLAlchemy connection layer used by the candle persistence path.
- `bootstrap/redis/*.py` handles the Redis client setup and Time Series initialization used across the service.

This keeps the live stream lightweight and predictable, while leaving the interval-based candle generation to Redis Time Series and the periodic Celery workers that flush completed buckets into PostgreSQL.

## PostgreSQL

### User Roles

The project provides separate PostgreSQL users for different responsibilities:

| User | Role | Purpose | Typical privileges |
| --- | --- | --- | --- |
| `transcendence_user` | Administrator | Initializes or changes the database schema | All privileges |
| `ingest_user` | Ingestion | Writes data from the pipeline | `INSERT`, `SELECT`, `UPDATE` |
| `reader_user` | Read-only | Reads data | `SELECT` |

Do not use `transcendence_user` for normal application work. Use `reader_user` for investigations and queries, and reserve `ingest_user` for ingestion operations.

### Accessing PostgreSQL

```bash
podman exec -it transcendence_db psql -U POSTGRES_USER -d POSTGRES_DB
```

Inside `psql`, use `\dt` to list tables. Use `reader_user` for read-only queries whenever possible.

## Redis

### Accessing Redis

```bash
podman exec -it transcendence_redis redis-cli -h REDIS_HOST -p REDIS_PORT
```

For local use, you can connect with `-a` and authenticate (-a REDIS_PASSWORD), or from inside the Redis shell:

```text
AUTH REDIS_PASSWORD
```

The latest cached ticker can be read with:

```text
TS.GET ts:{symbol}:ticks
It will return (timestamp, value) where timestamp is in millisecond since epoch (01/01/1970 00:00) and value in US Dollars.

GET cache:{symbol}:latest
It will return the full JSON of the latest cached price.
```

If you want the full detail OHLC of each timeframe (1m, 15m, 1h, 4h, 1d, 1w) of one currency:

```text
TS.INFO ts:{symbol}:ticks
```

If `MONITOR` is interrupted with `Ctrl+C`, authenticate again before running another command.