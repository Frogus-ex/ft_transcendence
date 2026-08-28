#!/bin/sh
set -e

# Prefer the secret file (e.g. POSTGRES_INGEST_PASSWORD_FILE) if present,
# otherwise fall back to the direct environment variable (e.g. POSTGRES_INGEST_PASSWORD).
if [ -n "$POSTGRES_INGEST_PASSWORD_FILE" ] && [ -f "$POSTGRES_INGEST_PASSWORD_FILE" ]; then
    INGEST_PASSWORD=$(cat "$POSTGRES_INGEST_PASSWORD_FILE")
else
    INGEST_PASSWORD="$POSTGRES_INGEST_PASSWORD"
fi

if [ -n "$POSTGRES_READONLY_PASSWORD_FILE" ] && [ -f "$POSTGRES_READONLY_PASSWORD_FILE" ]; then
    READONLY_PASSWORD=$(cat "$POSTGRES_READONLY_PASSWORD_FILE")
else
    READONLY_PASSWORD="$POSTGRES_READONLY_PASSWORD"
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_ADMIN_USER" --dbname "$POSTGRES_DB" <<-EOSQL

    -- Initializing the database
    CREATE TABLE IF NOT EXISTS market_ticks (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        price DECIMAL(18, 8) NOT NULL,
        quantity DECIMAL(18, 8) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Creating index for faster queries on symbol and timestamp
    CREATE INDEX IF NOT EXISTS idx_ticks_symbol_timestamp
    ON market_ticks(symbol, timestamp DESC);

    -----------------------------------------------------------------------------------------------
    -- Creating a user for ingestion with limited privileges (INSERT/SELECT only)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$POSTGRES_INGEST_USER') THEN
            CREATE USER "$POSTGRES_INGEST_USER" WITH PASSWORD '$INGEST_PASSWORD';
        ELSE
            ALTER USER "$POSTGRES_INGEST_USER" WITH PASSWORD '$INGEST_PASSWORD';
        END IF;
    END
    \$\$;

    -- Granting permissions to connect to the database and use the public schema
    GRANT CONNECT ON DATABASE transcendence_db TO "$POSTGRES_INGEST_USER";
    GRANT USAGE ON SCHEMA public TO "$POSTGRES_INGEST_USER";

    -- Granting privileges for reading and insertion
    GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO "$POSTGRES_INGEST_USER";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT ON TABLES TO "$POSTGRES_INGEST_USER";

    -- Granting privileges for sequences (if any)
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "$POSTGRES_INGEST_USER";

    -----------------------------------------------------------------------------------------------
    -- Creating a read-only user for analytics with limited privileges (SELECT only)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$POSTGRES_READONLY_USER') THEN
            CREATE USER "$POSTGRES_READONLY_USER" WITH PASSWORD '$READONLY_PASSWORD';
        ELSE
            ALTER USER "$POSTGRES_READONLY_USER" WITH PASSWORD '$READONLY_PASSWORD';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE transcendence_db TO "$POSTGRES_READONLY_USER";
    GRANT USAGE ON SCHEMA public TO "$POSTGRES_READONLY_USER";

    -- Granting privileges for reading only
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO "$POSTGRES_READONLY_USER";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "$POSTGRES_READONLY_USER";

EOSQL