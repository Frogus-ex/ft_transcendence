-- init.sql

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
CREATE USER IF NOT EXISTS ingestion_user WITH PASSWORD 'ingest123';
-- Granting permissiions to connect to the database and use the public schema
GRANT CONNECT ON DATABASE transcendence_db TO ingestion_user;
GRANT USAGE ON SCHEMA public TO ingestion_user;
-- Granting privileges for reading and insertion
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO ingestion_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT ON TABLES TO ingestion_user;
-- Granting privileges for sequences (if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ingestion_user;

-----------------------------------------------------------------------------------------------
-- Creating a read-only user for analytics with limited privileges (SELECT only)
CREATE USER IF NOT EXISTS reader_user WITH PASSWORD 'reader123';

GRANT CONNECT ON DATABASE transcendence_db TO reader_user;
GRANT USAGE ON SCHEMA public TO reader_user;
-- Granting privileges for reading only
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reader_user;