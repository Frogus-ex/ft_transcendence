from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import datetime

class CandleValidation(BaseModel):
    # For reading SQLAlchemy ORM
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    interval: str
    time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal