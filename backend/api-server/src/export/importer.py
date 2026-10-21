import csv
import io
import json
import logging
import xml.etree.ElementTree as et
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError, model_validator
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from auth_deps import get_current_user_id
from database import MarketCandle, get_async_session
from utils import Format, Interval, Symbol, limiter


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/import", tags=["Import"])

MAX_BODY_BYTES = 1_000_000
MAX_ROWS = 1000
MAX_ERRORS_REPORTED = 20
BUCKET_MS = {"1m": 60_000, "5m": 300_000, "1h": 3_600_000, "1d": 86_400_000, "1w": 604_800_000}
WEEK_ALIGN_MS = 345_600_000  # weekly candles start on Monday
CSV_COLUMNS = ["symbol", "interval", "time", "open", "high", "low", "close", "volume"]


class CandleImportRow(BaseModel):
    symbol: Symbol
    interval: Interval
    time: datetime
    open: Decimal = Field(gt=0, max_digits=18, decimal_places=8)
    high: Decimal = Field(gt=0, max_digits=18, decimal_places=8)
    low: Decimal = Field(gt=0, max_digits=18, decimal_places=8)
    close: Decimal = Field(gt=0, max_digits=18, decimal_places=8)
    volume: Decimal = Field(ge=0, max_digits=18, decimal_places=8)

    @model_validator(mode="after")
    def check_consistency(self):
        if self.time.tzinfo is None:
            self.time = self.time.replace(tzinfo=timezone.utc)
        if self.time > datetime.now(timezone.utc):
            raise ValueError("time must not be in the future")

        offset = WEEK_ALIGN_MS if self.interval == "1w" else 0
        timestamp_ms = int(self.time.timestamp() * 1000)
        if (timestamp_ms - offset) % BUCKET_MS[self.interval] != 0:
            raise ValueError(f"time is not aligned on a {self.interval} candle boundary")

        if self.high < max(self.open, self.close, self.low) or self.low > min(self.open, self.close, self.high):
            raise ValueError("inconsistent OHLC values (high must be the highest, low the lowest)")
        return self


def parse_rows(raw: bytes, fmt: str) -> list[dict[str, Any]]:
    """Turns the uploaded file into a list of raw row dictionaries."""

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The file must be UTF-8 encoded.")

    if fmt == "json":
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON: {exc.msg}")
        if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The JSON file must be an array of candle objects.")
        return data

    if fmt == "csv":
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None or not set(CSV_COLUMNS).issubset(reader.fieldnames):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The CSV header must contain: {', '.join(CSV_COLUMNS)}",
            )
        return list(reader)

    upper = text.upper()
    if "<!DOCTYPE" in upper or "<!ENTITY" in upper:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="XML documents with a DTD or entities are not allowed.")
    try:
        root = et.fromstring(raw)
    except et.ParseError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid XML: {exc}")
    return [{child.tag: (child.text or "").strip() for child in tick} for tick in root.findall("tick")]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    openapi_extra={"requestBody": {"required": True, "content": {"text/plain": {"schema": {"type": "string"}}}}},
)
@limiter.limit("5/minute")
async def import_market_data(
    request: Request,
    format: Format,
    user_id: Annotated[int, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
):
    """Imports candles from a CSV, JSON or XML file (same layout as the export).

    The whole file is validated first: if a single row is invalid, nothing is imported.
    Existing candles are never overwritten. Send the file content as the request body."""

    raw = await request.body()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The request body is empty.")
    if len(raw) > MAX_BODY_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (1 MB maximum).")

    rows = parse_rows(raw, format)
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No candle found in the file.")
    if len(rows) > MAX_ROWS:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"Too many rows ({MAX_ROWS} maximum).")

    valid_rows = []
    errors = []
    invalid_count = 0
    for index, row in enumerate(rows, start=1):
        try:
            valid_rows.append(CandleImportRow.model_validate(row).model_dump())
        except ValidationError as exc:
            invalid_count += 1
            if len(errors) < MAX_ERRORS_REPORTED:
                first = exc.errors()[0]
                field = ".".join(str(part) for part in first["loc"]) or "row"
                errors.append({"row": index, "error": f"{field}: {first['msg']}"})

    if invalid_count:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": f"{invalid_count} invalid row(s), nothing was imported.", "errors": errors},
        )

    statement = (
        insert(MarketCandle)
        .values(valid_rows)
        .on_conflict_do_nothing(index_elements=["symbol", "interval", "time"])
    )
    result = await db.execute(statement)
    await db.commit()

    inserted = result.rowcount if result.rowcount >= 0 else len(valid_rows)
    logger.info(f"User {user_id} imported {inserted}/{len(valid_rows)} candles")
    return {"received": len(valid_rows), "inserted": inserted, "skipped": len(valid_rows) - inserted}