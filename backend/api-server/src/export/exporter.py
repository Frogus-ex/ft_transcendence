import asyncio
import logging
<<<<<<< HEAD
<<<<<<< HEAD
import io
import csv
=======
>>>>>>> d391ed9 (feat: WIP, implementing data exports)
=======
import io
import csv
>>>>>>> 33ae139 (feat/docs: added data exporter with differents file type, need tests)
from fastapi import APIRouter
from fastapi.responses import Response, StreamingResponse
import xml.etree.ElementTree as et
from routers.markets import get_candles

router = APIRouter(prefix="/export", tags=["Export"])

router.get("")
async def   export_market_data(
    symbol: str,
    format: str,
    interval: str = "1m",
    limit: int = 100):
    """Export the data in format file from symbol"""

    data = await get_candles(symbol, interval, limit)

    fmt = format.lower()
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 33ae139 (feat/docs: added data exporter with differents file type, need tests)

    # FastAPI automatically converts into json type by default
    if fmt == 'json':
        return data
    elif fmt == 'csv':
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["symbol", "timestamp", "price", "volume"])
        writer.writeheader()
        writer.writerows(data)

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{symbol}.csv'}
        )
    elif fmt == 'xml':
        root = et.Element("market_data", symbol=symbol)
        for row in data:
            tick_element = et.SubElement(root, "tick")
            for key, value in row.items():
                child = et.SubElement(tick_element, key)
                child.text = str(value)

        xml_str = et.tostring(root, encoding="utf-8", method='xml')

        return Response(
            content=xml_str,
            media_type="application/xml",
            headers={"Content-Disposition": f'attachment; filename="{symbol}.xml'}
<<<<<<< HEAD
        )
=======
    ...
>>>>>>> d391ed9 (feat: WIP, implementing data exports)
=======
        )
>>>>>>> 33ae139 (feat/docs: added data exporter with differents file type, need tests)
