# To Update

# Data Ingestion Backend

The ingestion backend follows an EtLT pipeline (Extract, Transform-Light, Load, Transform-Heavy). It connects to the Binance WebSocket, extracts live market events, performs a lightweight validation and normalization step, stores the cleaned data in Redis and PostgreSQL, and then performs heavier transformations later to generate derived market data for the frontend.

## Why?

This architecture was chosen to balance speed, data quality, and storage efficiency for a real-time financial data stream.

For streaming products such as stock and crypto market data, the volume is high and the latency requirement is strict. A full ETL pipeline can become a bottleneck because each message is processed and transformed before it reaches storage, which slows the ingestion path and increases processing overhead under heavy load. In contrast, ELT is excellent for raw, high-volume ingestion because it keeps most data in storage and defers transformation. However, for this project, I do not want to store every unfiltered message as-is because the API stream contains noisy, redundant, or malformed payloads that are not useful for downstream analytics or frontend display.

The EtLT approach gives the best trade-off:

- Extract: fetch live trade data from the Binance API.
- Transform-Light: clean, validate, and normalize only the fields that matter (`symbol`, `price`, `quantity`, `timestamp`).
- Load: persist the lightweight cleaned data into Redis and PostgreSQL for fast access and persistence.
- Transform-Heavy: compute aggregates such as OHLC candles in a separate processing stage for analytics and visualization.

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
├── main.py
├── config.py
├── tasks.py
├── calculations/
│   └── operations.py
├── scripts/
│   └── init.sh
├── services/
│   ├── __init__.py
│   ├── listener.py
│   ├── parser.py
│   └── dispatcher.py
└── database/
	├── __init__.py
	├── redis_client.py
	├── db_client.py
	├── orm_db.py
	└── models.py
```

## Data Flow

The ingestion architecture is built around a simple, scalable pipeline:

1. The application starts one Binance WebSocket listener per symbol using an `asyncio.TaskGroup` in `main.py`.
2. Each listener connects to its stream, receives trade events in real time, and keeps the connection alive with automatic reconnection if it drops.
3. The raw payload is validated and normalized in the parsing stage to retain only the fields needed for the platform.
4. The cleaned data is sent to Redis for low-latency access and to PostgreSQL for persistence.
5. Heavy aggregation and candle-generation logic is intentionally deferred to the Celery-based calculations layer, which will run in `calculations/operations.py`.
6. The frontend consumes both the live feed and the derived aggregated time-series data needed for chart rendering and watchlist updates.

This keeps the real-time ingestion layer fast, while leaving heavier transformations to a separate processing stage.

## Project Architecture

The project is organized in a way that separates streaming, storage, and analytics responsibilities:

- `main.py` orchestrates the multi-stream ingestion startup.
- `services/listener.py` is responsible for maintaining each Binance connection.
- `services/parser.py` normalizes incoming message payloads.
- `services/dispatcher.py` sends the cleaned data to Redis and persists selected records in PostgreSQL.
- `database/` handles persistent storage and ORM models.
- `tasks.py` initializes the Celery worker configuration and task registry.
- `calculations/operations.py` is reserved for the heavier aggregation work, currently empty and ready for the data scientist.

This separation keeps the streaming path lightweight, stable, and easier to scale as more market pairs or aggregation windows are added.

## PostgreSQL

### User Roles

The project provides separate PostgreSQL users for different responsibilities:

| User | Role | Purpose | Typical privileges |
| --- | --- | --- | --- |
| `transcendence_user` | Administrator | Initializes or changes the database schema | All privileges |
| `ingest_user` | Ingestion | Writes data from the pipeline | `INSERT`, `SELECT` |
| `reader_user` | Read-only | Reads data and performs aggregate queries | `SELECT` |

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
GET ticker:BTCUSDT
```

If `MONITOR` is interrupted with `Ctrl+C`, authenticate again before running another command.