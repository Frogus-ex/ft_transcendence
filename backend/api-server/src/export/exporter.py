import csv
import io
import xml.etree.ElementTree as et
import logging

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from routers import fetch_candles
from database import get_async_session
from utils import CandleValidation, Format, Symbol, Interval, limiter


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("")
@limiter.limit("20/minute")
async def export_market_data(
    request: Request,
    symbol: Symbol,
    format: Format,
    interval: Interval = "1m",
    limit: int = Query(100, ge=1, le=1000),
    session: AsyncSession = Depends(get_async_session)
):
    """Export market data for a symbol in the requested format."""

    candles = await fetch_candles(symbol, interval, limit, session)

    if format == "json":
        return candles

    rows = [c.model_dump() for c in candles]
    fieldnames = list(CandleValidation.model_fields.keys())

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{symbol}.csv"'},
        )

    if format == "xml":
        root = et.Element("market_data", symbol=symbol)
        for row in rows:
            tick_element = et.SubElement(root, "tick")
            for key, value in row.items():
                child = et.SubElement(tick_element, key)
                child.text = str(value)

        et.indent(root, space="  ", level=0)

        xml_bytes = et.tostring(root, encoding="utf-8", method="xml", xml_declaration=True)

        return Response(
            content=xml_bytes,
            media_type="application/xml",
            headers={"Content-Disposition": f'attachment; filename="{symbol}.xml"'},
        )

    return Response(
        content="Unsupported export format",
        media_type="text/plain",
        status_code=400,
    )