from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DB_URL
import logging

logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

# Creating the synchronous engine for the worker process
engine = create_engine(
    DB_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
)

metadata = MetaData()

market_candles = Table("market_candles", metadata, autoload_with=engine)

# Creating sync sessions
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

# Declarative base class for SQLAlchemy >=2.0
Base = declarative_base()

def get_session():
    """Yields a synchronous SQLAlchemy session."""
    with SessionLocal() as session:
        yield session