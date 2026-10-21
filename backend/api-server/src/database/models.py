from datetime import datetime
from decimal import Decimal
from sqlalchemy import Index, Numeric, String, DateTime, UniqueConstraint, Integer, func, ForeignKey, CheckConstraint, BIGINT, Column, Boolean
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
	two_fa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
	totp_secret: Mapped[str | None] = mapped_column(String(32), nullable=True)

class Portfolio(Base):
	__tablename__ = "portfolio"

	id: Mapped[int] = mapped_column(primary_key=True)
	user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
	cash_balance: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False, default=0)
	positions: Mapped[dict] = mapped_column(String, nullable=False, default="{}")




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

class ApiKey(Base):
	__tablename__ = "api_keys"

	id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
	user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
	key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
	key_prefix: Mapped[str] = mapped_column(String(12), nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Friendships(Base):
	__tablename__ = "friends"
	__table_args__ = (
		UniqueConstraint("user_low_id", "user_high_id", name="uq_friends_pair"),
		CheckConstraint("user_low_id < user_high_id", name="ck_friends_ordered_pair"),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	user_low_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	user_high_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	requester_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	status: Mapped[bool] = mapped_column(default=False, nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Messages(Base):
	__tablename__ = "messages"

	id: Mapped[int] = mapped_column(primary_key=True)
	sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	content: Mapped[str] = mapped_column(String(1000), nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
	read_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=None, nullable=True)