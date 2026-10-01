from pydantic import BaseModel, ConfigDict
from decimal import Decimal


class CandleValidation(BaseModel):
    # For reading SQLAlchemy ORM
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    interval: str
    time: str
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal