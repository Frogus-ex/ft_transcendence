import json
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

tz_paris = ZoneInfo("Europe/Paris")

def parse_raw_data(raw_data: str) -> dict | None :
    try:
        data = json.loads(raw_data)

        return {
            "symbol": data['s'],
            "price": float(data['p']),
            "quantity": float(data['q']),
            "trading_time": datetime.fromtimestamp(data['T'] / 1000.0, tz=tz_paris).replace(microsecond=0)
        }

    except (KeyError, ValueError, json.JSONDecodeError):
        return None