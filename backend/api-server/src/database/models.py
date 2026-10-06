from datetime import datetime
from decimal import Decimal
from sqlalchemy import Index, Numeric, String, DateTime, UniqueConstraint, Column, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from .orm_db import Base


class MarketCandle(Base):
    __tablename__ = "market_candles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    interval: Mapped[str] = mapped_column(String(5), nullable=False)
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    open: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    volume: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)

    __table_args__ = (
        UniqueConstraint("symbol", "interval", "time", name="uq_candles_symbol_interval_time"),
        Index("idx_candles_symbol_time", "symbol", time.desc()),
    )

    def __repr__(self) -> str:
        return f"<Ticker {self.symbol} - Interval: {self.interval} at {self.time}>"

class Users(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)