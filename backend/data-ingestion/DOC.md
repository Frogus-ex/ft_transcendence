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
├── scripts/
│   └── init.sh
├── services/
│   ├── __init__.py
│   ├── parser.py
│   └── dispatcher.py
└── database/
	├── __init__.py
	├── redis_client.py
	├── db_client.py
	├── orm_db.py
	└── models.py
```

The files are grouped by responsibility:

- `main.py`: runs the ingestion loop and manages the WebSocket connection.
- `config.py`: loads application settings and secrets.
- `tasks.py`: Celery worker for calculating heavy data in background.
- `scripts/init.sh`: initializes the PostgreSQL schema and application users.
- `services/`: parses incoming data and dispatches it to external services.
- `database/`: provides Redis access, PostgreSQL access, and SQLAlchemy definitions.
- `__init__.py`: marks directories as Python packages and can expose selected public functions.

## Data Flow

1. `main.py` connects to the Binance BTCUSDT WebSocket stream and listens for live trade events.
2. `parser.py` performs a light transformation by validating and normalizing the raw JSON payload into a minimal, useful structure.
3. `dispatcher.py` writes the latest value to Redis and periodically writes filtered price updates to PostgreSQL.
4. `redis_client.py` stores the current ticker as JSON in Redis for low-latency access.
5. `db_client.py` persists the cleaned tick-level records through the SQLAlchemy ORM.
- `tasks.py` performs the heavy transformation step by aggregating tick data into higher-level market summaries for the frontend.

## Application Files

### `main.py`

This is the application entry point. The Binance endpoint is defined as:

```python
BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade"
```

Before receiving data, the application initializes the PostgreSQL connection pool. It then opens an asynchronous WebSocket connection and continuously receives messages.

The connection uses periodic pings to remain active. If Binance closes the connection or another error occurs, the application logs the problem and retries after a short delay. The PostgreSQL pool is closed in the `finally` block when the application stops.

### `config.py`

This module centralizes configuration for PostgreSQL and Redis. Values are read from environment variables, which allows the same code to run locally or inside Docker without hard-coded credentials.

For passwords, the module first tries to read the path provided by a Docker secret variable such as `POSTGRES_INGEST_PASSWORD_FILE` or `REDIS_PASSWORD_FILE`. If the file cannot be used, it falls back to the corresponding password environment variable.

It also builds `DB_URL`, the SQLAlchemy connection URL used by the ORM. A warning is logged when required PostgreSQL settings are missing.

### `services/parser.py`

`parse_raw_data()` converts a raw JSON message from Binance into a normalized Python dictionary containing:

- `symbol`: the trading pair, such as `BTCUSDT`.
- `price`: the trade price as a `float`.
- `quantity`: the traded quantity as a `float`.
- `timestamp`: the trade time as a UTC-aware `datetime`.

If the message is invalid or a required field is missing, the function returns `None`. The caller can then ignore the invalid message without stopping the ingestion loop.

### `services/dispatcher.py`

`process_and_dispatch()` sends every valid record to Redis so the cache always contains the most recent ticker.

To limit PostgreSQL writes, it stores a record only when both conditions are met:

- at least one second has passed since the previous database write;
- the price is different from the last stored price.

This keeps the real-time cache current while reducing duplicate database records and unnecessary database traffic.

### `tasks.py`

`tasks.py` calculates aggregated market summaries across multiple time scales (for example: 1s, 1m, 5m, 1h). It reads recent tick records, computes grouped aggregates for the configured intervals, and writes the derived results back to the database using the helpers in `db_client.py`. Data scientists extending `tasks.py` should review the persistence patterns in `save_to_db()` and follow existing transaction/session conventions.

### `database/redis_client.py`

This module creates a Redis connection pool using the configuration loaded by `config.py`.

`save_to_cache_and_publish()` stores each ticker under a key such as `ticker:BTCUSDT`. The record is serialized as JSON before it is written. Because Python's `datetime` objects are not JSON serializable by default, `date_time_encoder()` converts timestamps to ISO 8601 strings.

Redis connection errors are ignored so a temporary cache failure does not stop the ingestion pipeline. Other Redis errors are logged.

### `database/db_client.py`

This module manages the PostgreSQL connection pool and persists ticker data.

`init_db_pool()` creates a psycopg (psycopg3) connection pool with a maximum of 10 connections. Reusing pooled connections avoids opening and closing a new database connection for every operation; SQLAlchemy's engine and session are used for ORM writes.

`save_to_db()` creates a `Ticker` ORM object from the cleaned dictionary, adds it to a synchronous SQLAlchemy session, and commits the transaction. If the write fails, the session is rolled back and the error is logged.

`close_db_pool()` closes the psycopg pool cleanly when the application shuts down.

The aggregation tasks in `tasks.py` call `save_to_db()` and other helpers from this module to persist derived market summaries; review `db_client.py` for transaction and session patterns to follow.

### `database/orm_db.py`

This module contains the shared SQLAlchemy setup:

- `engine` creates the synchronous connection engine using `DB_URL`;
- `SessionLocal` creates synchronous database sessions;
- `Base` is the declarative base class used by ORM models;
- `get_session()` provides a session and closes it automatically when the operation finishes.

The engine is configured with a pool size of 10 and can temporarily create up to 20 additional connections through `max_overflow`.

### `database/models.py`

This module defines the database schema used by SQLAlchemy. The `Ticker` class maps to the `market_ticks` PostgreSQL table.

Each ticker record contains an auto-incrementing identifier, symbol, price, quantity, trade timestamp, and automatically generated creation timestamp. Prices and quantities use `Numeric(18, 8)` to preserve decimal precision.

The `idx_ticks_symbol_timestamp` index improves queries that filter by symbol and sort by the most recent timestamp.

`tasks.py` relies on the `Ticker` schema for both raw ticks and aggregated records. See `models.py` to understand column types (for example `Numeric(18, 8)`) and existing indexes before designing new aggregate tables or altering existing ones.

### `scripts/init.sh`

This shell script initializes PostgreSQL when the database container is created for the first time. Docker Compose mounts it at PostgreSQL's `/docker-entrypoint-initdb.d/init.sh` path, so the official PostgreSQL image executes it automatically during the initial database setup.

The script starts with `set -e`, which stops execution if a command fails. It uses `psql` with `ON_ERROR_STOP=1` so SQL errors also stop the initialization instead of allowing the database to continue in a partially configured state.

Before executing the SQL, the script loads the ingestion and read-only passwords. It prefers the Docker secret files specified by `POSTGRES_INGEST_PASSWORD_FILE` and `POSTGRES_READONLY_PASSWORD_FILE`, then falls back to `POSTGRES_INGEST_PASSWORD` and `POSTGRES_READONLY_PASSWORD` if the files are unavailable.

The SQL block performs the following operations:

- creates the `market_ticks` and `market_candles` tables if it does not already exist;
- creates the `idx_ticks_symbol_timestamp` and `idx_candles_symbol_time` indexes for queries by symbol and descending timestamp;
- creates the ingestion user if necessary, or updates its password if it already exists;
- grants the ingestion user permission to connect, use the public schema, and select or insert table data;
- grants the ingestion user sequence permissions required for auto-incrementing IDs;
- creates the read-only user if necessary, or updates its password if it already exists;
- grants the read-only user permission to connect, use the public schema, and select table data.

The `CREATE ... IF NOT EXISTS` statements make the schema setup repeatable. The user-management blocks use PostgreSQL's `DO` syntax to check whether each role exists before creating or updating it.

Because this script is part of PostgreSQL's first-start initialization process, changing it does not automatically update an existing database volume. After modifying the script, apply the changes with an appropriate migration or recreate the database volume only when existing data may safely be removed.

### `__init__.py`

Both `services/` and `database/` contain an `__init__.py` file. These files make the directories importable as Python packages.

They also re-export selected functions. For example, `services/__init__.py` allows:

```python
from services import parse_raw_data
```

instead of:

```python
from services.parser import parse_raw_data
```

The current `main.py` imports from the individual modules, so the re-exports are optional. An empty `__init__.py` is also valid when no package-level public API is needed.

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