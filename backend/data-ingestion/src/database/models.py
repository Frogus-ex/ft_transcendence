from datetime import datetime
from decimal import Decimal
from sqlalchemy import Index, Numeric, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from orm_db import Base

class Ticker(Base):
    __tablename__ = "market_ticks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # For index (optimization)
    __table_args__ = (
        Index("idx_ticks_symbol_timestamp", "symbol", timestamp.desc())
    )

    def __repr__(self) -> str:
        return f"<Ticker {self.symbol} - Price: {self.price} - Quantity: {self.quantity} at {self.timestamp}>"