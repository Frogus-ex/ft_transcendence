from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import datetime

class TickerValidation(BaseModel):
    # For reading SQLAlchemy ORM
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    price: Decimal
    quantity: Decimal
    timestamp: datetime

class IndicatorValidation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    indicator_name: str
    value: Decimal
    timestamp: datetime