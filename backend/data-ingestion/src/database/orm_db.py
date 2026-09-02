import logging
from typing import AsyncGenerator
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    AsyncSession,
    create_async_engine,
)
from config import DB_URL

logger = logging.getLogger(__name__)

# Creating the async engine for the whole process
engine = create_async_engine(
    DB_URL,
    echo=True,
    pool_size=10,
    max_overflow=20,
)

# Creating async sessions
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Declarative base class for SQLAlchemy >=2.0
class Base(DeclarativeBase):
    pass

# Generates continuous sessions
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session