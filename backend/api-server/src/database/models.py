from datetime import datetime
from decimal import Decimal
from sqlalchemy import Index, Numeric, String, DateTime, UniqueConstraint, Column, Integer, func, ForeignKey
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
	__tablename__ = "users"
    
	id: Mapped[int] = mapped_column(primary_key=True)
	username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
	email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
	password_hash: Mapped[str] = mapped_column(String, nullable=False)
	avatar_url: Mapped[str] = mapped_column(String)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
class Portfolio(Base):
	__tablename__ = "portfolio"

	id: Mapped[int] = mapped_column(primary_key=True)
	user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
	cash_balance: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=10000)
	positions: Mapped[dict] = mapped_column(String, nullable=False, default="[]")


class Order(Base):
	__tablename__ = "orders"

	id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
	user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	symbol: Mapped[str] = mapped_column(String(20), nullable=False)
	side: Mapped[str] = mapped_column(String(4), nullable=False)
	quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
	price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
	realized_pnl: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
	status: Mapped[str] = mapped_column(String(10), nullable=False, default="filled")
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

	__table_args__ = (
		Index("idx_orders_user_created", "user_id", created_at.desc()),
	)