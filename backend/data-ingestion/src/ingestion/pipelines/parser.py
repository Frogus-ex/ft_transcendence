import json
from datetime import datetime
from zoneinfo import ZoneInfo

TZ_UTC = ZoneInfo("UTC")


def parse_raw_data(raw_data: str) -> dict | None:
    """Parsing the raw data from Binance websocket and returning a cleaned dictionary."""
    try:
        data = json.loads(raw_data)
        return {
            "symbol": data["s"],
            "price": float(data["p"]),
            "quantity": float(data["q"]),
            "timestamp": datetime.fromtimestamp(data["T"] / 1000.0, tz=TZ_UTC),
        }
    except (KeyError, ValueError, json.JSONDecodeError):
        return None