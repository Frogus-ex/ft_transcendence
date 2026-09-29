import logging

from sqlalchemy import MetaData, Table, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from src.config import DB_URL

logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

engine = create_engine(
    DB_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

metadata = MetaData()
market_candles = Table("market_candles", metadata, autoload_with=engine)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

Base = declarative_base()


def get_session():
    """Yields a synchronous SQLAlchemy session."""
    with SessionLocal() as session:
        yield session